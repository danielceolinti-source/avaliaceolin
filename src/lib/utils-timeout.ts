/**
 * Utilitário para garantir que uma Promise não rode infinitamente.
 * Se o tempo ultrapassar o limite, a Promise é rejeitada.
 */
export async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number = 10000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT_EXCEEDED"));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
