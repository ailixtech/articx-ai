// A round profile picture, or the person's initials when they haven't uploaded one.
export function initials(name, email) {
  const words = (name || email || "?").trim().split(/\s+/);
  return (name ? words.slice(0, 2) : words.slice(0, 1)).map((w) => w.charAt(0).toUpperCase()).join("");
}

export default function Avatar({ photo, name, email, className = "size-9 text-[.95rem]" }) {
  return (
    <span className={`grid flex-none place-items-center overflow-hidden rounded-full bg-lake font-head font-semibold text-lake-ink ${className}`}>
      {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="block size-full object-cover" /> : initials(name, email)}
    </span>
  );
}

// Center-crops an image file to a square and returns a small JPEG data URL (stored in Firestore).
export function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) return reject(new Error("not_image"));
    // FileReader (not a blob: URL) because the Content-Security-Policy only allows data: images.
    const reader = new FileReader();
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // transparent PNGs get a white background in JPEG
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("not_image"));
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = () => reject(new Error("not_image"));
    reader.readAsDataURL(file);
  });
}
