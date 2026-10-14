import { labelAdminHandlers } from "@/lib/v2/label-admin"

export const { GET, POST } = labelAdminHandlers({
  table: "categories",
  column: "category",
  inUseError: (count) =>
    `Categoria em uso por ${count} transações. Renomeie ou mescle antes de excluir.`,
})
