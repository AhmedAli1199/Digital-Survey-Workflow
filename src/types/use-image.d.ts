declare module 'use-image' {
  type UseImageResult = [HTMLImageElement | undefined, 'loading' | 'loaded' | 'failed'];

  export default function useImage(
    url?: string | null,
    crossOrigin?: string,
    referrerPolicy?: string,
  ): UseImageResult;
}
