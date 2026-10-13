declare module "officeparser" {
  export function parseOffice(
    data: Buffer | string,
    callback?: (data: string, err?: any) => void
  ): Promise<string>;
  export function convert(
    file: Buffer | string,
    destination: string,
    config?: any
  ): Promise<string>;
}
