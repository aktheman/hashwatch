declare module 'react-native-html-to-pdf' {
  interface ConvertOptions {
    html: string;
    fileName?: string;
    base64?: boolean;
  }

  interface ConvertResult {
    filePath?: string;
    uri?: string;
    base64?: string;
  }

  const PdfPrinter: {
    convert(options: ConvertOptions): Promise<ConvertResult>;
  };

  export default PdfPrinter;
}
