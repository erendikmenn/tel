import type { DigestItem } from "../../src/lib/digest";
import { viewItems } from "../../src/lib/filter";
import {
  clearReads,
  countRead,
  countUnread,
  filterUnread,
  isRead,
  loadReads,
  markRead,
  pruneReads,
  saveReads,
  type StorageLike,
} from "../../src/lib/reads";

export type ReadAssert = (name: string, ok: boolean, detail?: string) => void;

function makeStore(initial: string | null = null): StorageLike & { value: string | null } {
  const store = {
    value: initial,
    getItem() {
      return store.value;
    },
    setItem(_key: string, next: string) {
      store.value = next;
    },
    removeItem() {
      store.value = null;
    },
  };
  return store;
}

/** Okuma durumu (okundu/okunmadı + "sadece yeni") kuralları. */
export function checkReadRules(items: DigestItem[], assert: ReadAssert) {
  const now = 1_700_000_000_000;
  const sample = [{ id: "a" }, { id: "b" }, { id: "c" }];

  assert("başta hiçbiri okunmuş değil", countUnread({}, sample) === 3);

  const one = markRead({}, ["a"], now);
  assert("markRead işaretler", isRead(one, "a") && !isRead(one, "b"));
  assert("markRead okunmamış sayısını düşürür", countUnread(one, sample) === 2);
  assert("markRead zaman damgasını yazar", one.a === now);
  assert("markRead boş listede aynı haritayı döndürür", markRead(one, [], now) === one);
  assert("countRead kayıt sayısını verir", countRead(one) === 1);
  assert("clearReads boşaltır", countRead(clearReads()) === 0);

  // Budama: 120 günden eski kayıtlar düşer, tazeler kalır.
  const stale = markRead({}, ["x"], now - 200 * 24 * 3600_000);
  assert("eski kayıtlar budanır", countRead(pruneReads(stale, now)) === 0);
  assert("taze kayıtlar kalır", countRead(pruneReads(one, now)) === 1);

  // Depo: kaydet/yükle, bozuk veriye dayanıklılık.
  const store = makeStore();
  saveReads(store, one);
  const loaded = loadReads(store, now);
  assert("kaydedilip geri yüklenir", isRead(loaded, "a") && countRead(loaded) === 1);
  assert("bozuk JSON çökmez", countRead(loadReads(makeStore("bozuk"), now)) === 0);
  assert("dizi JSON kabul edilmez", countRead(loadReads(makeStore("[1,2]"), now)) === 0);
  assert("sayı olmayan değerler atılır", countRead(loadReads(makeStore('{"a":"x","b":5}'), 6000)) === 1);
  assert("depo yoksa boş harita", countRead(loadReads(null, now)) === 0);

  // Gerçek haberler üzerinde "sadece yeni".
  const first = items[0].id;
  const reads = markRead({}, [first], Date.now());
  const all = viewItems(items, {});
  const onlyNew = viewItems(items, { reads, onlyNew: true });

  assert("onlyNew okunanı düşürür", onlyNew.length === all.length - 1);
  assert("onlyNew okunanı içermez", !onlyNew.some((item) => item.id === first));
  assert("onlyNew kalan okunmamışları içerir", onlyNew.every((item) => !isRead(reads, item.id)));
  assert("filterUnread ile aynı sonuç", filterUnread(reads, all).length === onlyNew.length);
  assert(
    "onlyNew sırayı bozmaz",
    onlyNew.every((item, index) => index === 0 || all.indexOf(item) > all.indexOf(onlyNew[index - 1])),
  );
  assert("okuma süzgeci olmadan liste değişmez", viewItems(items, { reads }).length === all.length);
  // Sıra: önce kaynak başına cap, sonra okuma süzgeci. Cap'lenmiş her şeyi
  // okundu sayınca "sadece yeni" BOŞ dönmeli; havuzdan yerine haber gelmemeli.
  const onePerSource = viewItems(items, { perSource: 1 });
  const allCappedRead = markRead({}, onePerSource.map((item) => item.id), Date.now());
  assert(
    "cap -> okuma sırası: hepsi okununca liste boşalır",
    viewItems(items, { reads: allCappedRead, onlyNew: true, perSource: 1 }).length === 0,
  );
  assert(
    "okunmayanlar hâlâ geliyor",
    viewItems(items, { reads: allCappedRead, onlyNew: true, perSource: 1, offset: 0 }).length === 0 &&
      viewItems(items, { reads: allCappedRead, onlyNew: true }).length < all.length,
  );
}
