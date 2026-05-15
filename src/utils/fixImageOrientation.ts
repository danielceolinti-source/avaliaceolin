import exifr from "exifr";

/**
 * Lê a orientação EXIF de uma imagem e retorna uma URL/dataURL corrigida via canvas.
 * Funciona com File (upload) ou string (URL já salva).
 * Em caso de erro, retorna a imagem original sem modificação.
 */
export async function fixImageOrientation(input: File | string): Promise<string> {
  try {
    let orientation = 1;
    let imageUrl: string;

    if (input instanceof File) {
      try {
        orientation = (await exifr.parse(input))?.Orientation ?? 1;
      } catch {
        orientation = 1;
      }
      imageUrl = URL.createObjectURL(input);
    } else {
      try {
        const response = await fetch(input);
        const blob = await response.blob();
        orientation = (await exifr.parse(blob))?.Orientation ?? 1;
      } catch {
        orientation = 1;
      }
      imageUrl = input;
    }

    if (orientation === 1) return imageUrl;

    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          const swap = [5, 6, 7, 8].includes(orientation);
          canvas.width = swap ? img.height : img.width;
          canvas.height = swap ? img.width : img.height;

          const transforms: Record<number, () => void> = {
            2: () => ctx.transform(-1, 0, 0, 1, canvas.width, 0),
            3: () => ctx.transform(-1, 0, 0, -1, canvas.width, canvas.height),
            4: () => ctx.transform(1, 0, 0, -1, 0, canvas.height),
            5: () => ctx.transform(0, 1, 1, 0, 0, 0),
            6: () => ctx.transform(0, 1, -1, 0, canvas.height, 0),
            7: () => ctx.transform(0, -1, -1, 0, canvas.height, canvas.width),
            8: () => ctx.transform(0, -1, 1, 0, 0, canvas.width),
          };
          transforms[orientation]?.();
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch {
          resolve(imageUrl);
        }
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  } catch {
    return input instanceof File ? URL.createObjectURL(input) : input;
  }
}

/**
 * Recebe um File, aplica correção de orientação EXIF e devolve um novo File pronto para upload.
 * Se a orientação já for normal (1) ou houver erro, devolve o arquivo original.
 */
export async function fixFileOrientation(file: File): Promise<File> {
  try {
    const orientation = (await exifr.parse(file))?.Orientation ?? 1;
    if (orientation === 1) return file;

    const dataUrl = await fixImageOrientation(file);
    if (!dataUrl.startsWith("data:")) return file;

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
