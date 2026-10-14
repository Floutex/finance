import { labelAdminHandlers } from "@/lib/v2/label-admin"

export const { GET, POST } = labelAdminHandlers({
  table: "events",
  column: "event",
  inUseError: (count) =>
    `Evento em uso por ${count} transações. Renomeie ou mescle antes de excluir.`,
})
