declare module "mammoth/mammoth.browser" {
  type MammothResult = {
    value: string;
    messages?: Array<{
      type: string;
      message: string;
    }>;
  };

  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<MammothResult>;

  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<MammothResult>;
}
