export default function AdminLoading() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-12 text-center text-muted-foreground">
      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground mb-3" />
      Carregando...
    </div>
  )
}
