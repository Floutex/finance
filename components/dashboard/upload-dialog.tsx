"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { Image as ImageIcon, Loader2, Save, X } from "lucide-react"
import type { ExtractedTransaction } from "./types"

interface UploadDialogProps {
  open: boolean
  uploadedImage: string | null
  analyzing: boolean
  savePending: boolean
  extractedTransactions: ExtractedTransaction[]
  error: string | null
  currentUser: string
  onClose: () => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onAnalyze: () => void
  onUpdateTransaction: (index: number, field: keyof ExtractedTransaction, value: string | number) => void
  onSave: () => void
  onSetUploadedImage: (value: string | null) => void
  onSetUploadedFile: (value: File | null) => void
  onSetExtractedTransactions: (value: ExtractedTransaction[]) => void
  onSetError: (value: string | null) => void
}

export function UploadDialog({
  open,
  uploadedImage,
  analyzing,
  savePending,
  extractedTransactions,
  error,
  currentUser,
  onClose,
  onImageUpload,
  onRemoveImage,
  onAnalyze,
  onUpdateTransaction,
  onSave,
  onSetUploadedImage,
  onSetUploadedFile,
  onSetExtractedTransactions,
  onSetError,
}: UploadDialogProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith("image/")) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            onSetUploadedFile(file)
            const reader = new FileReader()
            reader.onload = e => {
              onSetUploadedImage(e.target?.result as string)
            }
            reader.readAsDataURL(file)
            onSetExtractedTransactions([])
            onSetError(null)
          }
          break
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("paste", handlePaste)
    }
  }, [open, onSetUploadedFile, onSetUploadedImage, onSetExtractedTransactions, onSetError])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !analyzing && !savePending) {
      event.stopPropagation()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex h-full items-center justify-center p-4" onKeyDown={handleKeyDown}>
        <div
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-dialog-title"
          aria-describedby="upload-dialog-description"
        >
          <div className="flex items-center justify-between">
            <p id="upload-dialog-title" className="text-lg font-semibold">
              Adicionar transações por imagem
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={analyzing || savePending}
              aria-label="Fechar formulário de upload"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p id="upload-dialog-description" className="mt-2 text-sm text-muted-foreground">
            Faça upload de uma imagem contendo transações ou cole uma imagem (Ctrl+V). O sistema irá extrair automaticamente as informações.
          </p>

          <div className="mt-6 space-y-6">
            {!uploadedImage ? (
              <div className="space-y-2">
                <Label htmlFor="image-upload">Selecionar imagem ou colar (Ctrl+V)</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Você também pode colar uma imagem usando Ctrl+V quando este dialog estiver aberto
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Imagem selecionada</Label>
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="max-h-64 w-full rounded-md border border-border object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onRemoveImage}
                      className="absolute right-2 top-2"
                      aria-label="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {extractedTransactions.length === 0 && (
                  <Button
                    type="button"
                    onClick={onAnalyze}
                    disabled={analyzing}
                    className="w-full"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analisando imagem...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Analisar imagem
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {extractedTransactions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {extractedTransactions.length === 1
                      ? "1 transação extraída"
                      : `${extractedTransactions.length} transações extraídas`}
                  </p>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {extractedTransactions.map((transaction, index) => (
                    <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`desc-${index}`}>Descrição</Label>
                          <Input
                            id={`desc-${index}`}
                            value={transaction.description}
                            onChange={e => onUpdateTransaction(index, "description", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`date-${index}`}>Data</Label>
                          <Input
                            id={`date-${index}`}
                            type="date"
                            value={transaction.date}
                            onChange={e => onUpdateTransaction(index, "date", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`amount-${index}`}>Valor total</Label>
                          <Input
                            id={`amount-${index}`}
                            type="number"
                            step="0.01"
                            value={transaction.amount}
                            onChange={e => onUpdateTransaction(index, "amount", parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`paid_by-${index}`}>Pago por</Label>
                          <PayerSelector
                            value={transaction.paid_by}
                            onChange={(value) => onUpdateTransaction(index, "paid_by", value)}
                            currentUser={currentUser}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Participantes</Label>
                          <div className="text-xs text-muted-foreground">
                            {transaction.participants.join(", ")}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`category-${index}`}>Categoria</Label>
                          <div>
                            <CategorySelector
                              value={transaction.category}
                              onChange={(value) => onUpdateTransaction(index, "category", value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={savePending}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" onClick={onSave} disabled={savePending}>
                    {savePending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar todas as transações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
