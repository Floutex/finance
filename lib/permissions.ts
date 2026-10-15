import type { Tables } from "@/lib/database.types"

export type Participant = Tables<"participants">

export type ParticipantPermissions = {
  can_change_payer: boolean
  can_manage_categories: boolean
  can_manage_invites: boolean
  can_delete_others_tx: boolean
  can_manage_income: boolean
  can_view_audit: boolean
}

export type EffectivePermissions = ParticipantPermissions & {
  isAdmin: boolean
}

export const DEFAULT_PERMISSIONS: ParticipantPermissions = {
  can_change_payer: false,
  can_manage_categories: false,
  can_manage_invites: false,
  can_delete_others_tx: false,
  can_manage_income: false,
  can_view_audit: false,
}

export const ALL_PERMISSIONS_GRANTED: ParticipantPermissions = {
  can_change_payer: true,
  can_manage_categories: true,
  can_manage_invites: true,
  can_delete_others_tx: true,
  can_manage_income: true,
  can_view_audit: true,
}

export const PERMISSION_METADATA: {
  key: keyof ParticipantPermissions
  label: string
  description: string
}[] = [
  {
    key: "can_change_payer",
    label: "Mudar quem pagou",
    description: "Permite registrar ou editar despesas pagas por outros participantes.",
  },
  {
    key: "can_manage_categories",
    label: "Categorias",
    description: "Permite criar novas categorias no formulário e gerenciar a lista de categorias.",
  },
  {
    key: "can_manage_invites",
    label: "Convites e links",
    description: "Permite ver o link de convite geral e gerar ou revogar links pessoais.",
  },
  {
    key: "can_delete_others_tx",
    label: "Excluir despesas de outros",
    description: "Permite excluir ou fazer exclusão em lote de transações pagas por terceiros.",
  },
  {
    key: "can_manage_income",
    label: "Renda mensal",
    description: "Permite visualizar e alterar os valores de renda mensal em /dashboard/income.",
  },
  {
    key: "can_view_audit",
    label: "Audit log",
    description: "Permite consultar o histórico completo de auditoria em /admin/audit.",
  },
]

export function parsePermissions(raw: unknown): ParticipantPermissions {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PERMISSIONS }
  const obj = raw as Record<string, unknown>
  return {
    can_change_payer: Boolean(obj.can_change_payer),
    can_manage_categories: Boolean(obj.can_manage_categories),
    can_manage_invites: Boolean(obj.can_manage_invites),
    can_delete_others_tx: Boolean(obj.can_delete_others_tx),
    can_manage_income: Boolean(obj.can_manage_income),
    can_view_audit: Boolean(obj.can_view_audit),
  }
}

export function getEffectivePermissions(
  participant: (Partial<Participant> & { name?: string | null }) | null | undefined
): EffectivePermissions {
  if (!participant) {
    return {
      isAdmin: false,
      ...DEFAULT_PERMISSIONS,
    }
  }

  // Fallback check: Antônio is always admin unless explicitly set otherwise in DB
  const isAdmin = Boolean(participant.is_admin) || participant.name === "Antônio"

  if (isAdmin) {
    return {
      isAdmin: true,
      ...ALL_PERMISSIONS_GRANTED,
    }
  }

  const parsed = parsePermissions(participant.permissions)
  return {
    isAdmin: false,
    ...parsed,
  }
}
