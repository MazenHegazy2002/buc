declare module "officeparser" {
  export function parseOffice(
    data: Buffer | string,
    callback?: (data: string, err?: any) => void
  ): Promise<string>;
  export function parseOfficeAsync(data: Buffer | string, config?: any): Promise<string>;
}
