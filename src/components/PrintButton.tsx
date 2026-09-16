"use client";

/** Tarayıcının "PDF olarak kaydet" akışını açar (yazdırma = gazete sayfası). */
export function PrintButton() {
  return (
    <button type="button" className="paper-button" onClick={() => window.print()}>
      PDF olarak kaydet
    </button>
  );
}
