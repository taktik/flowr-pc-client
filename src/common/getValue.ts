export function getValue<
  TData,
  TPath extends string,
  TDefault = GetFieldType<TData, TPath>
>(
  data: TData,
  path: TPath,
  defaultValue?: TDefault
): GetFieldType<TData, TPath> | TDefault {
  const value = path
    .split('.')
    .reduce<GetFieldType<TData, TPath>>(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      (v, key) => (v as any)?.[key],
      data as any
    )

  return value !== undefined ? value : defaultValue
}
