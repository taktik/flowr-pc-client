declare const __RENDERER_SERVER_PORT__: string

type GetFieldType<Obj, Path> = Path extends `${infer Left}.${infer Right}`
  ? Left extends keyof Obj
    ? GetFieldType<Exclude<Obj[Left], undefined>, Right> | Extract<Obj[Left], undefined>
    : undefined
  : Path extends keyof Obj
    ? Obj[Path]
    : undefined

declare module '*.svg' {
  const SVG: string
  export default SVG
}
declare module '*.png' {
  const PNG: string
  export default PNG
}
declare module '*.woff2' {
  const WOFF2: string
  export default WOFF2
}