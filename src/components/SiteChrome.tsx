import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="mast">
      <Link href="/" className="wordmark">
        {APP_NAME}
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="colophon">
      <p>{APP_NAME} — seçilmiş kaynaklardan günün haberleri.</p>
    </footer>
  );
}
