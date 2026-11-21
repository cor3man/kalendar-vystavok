/** Starts a browser download of `blob` as `fileName`. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}

/** Downloads a JSON text file. */
export function downloadJson(text: string, fileName: string): void {
  downloadBlob(new Blob([text], { type: 'application/json' }), fileName);
}
