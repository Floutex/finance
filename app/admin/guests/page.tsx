"use client"

import { GuestsPanel } from "@/components/admin/guests-panel"
import { InvitePanel } from "@/components/admin/invite-panel"

export default function GuestsPage() {
  return (
    <div className="space-y-6">
      <InvitePanel />
      <GuestsPanel />
    </div>
  )
}
