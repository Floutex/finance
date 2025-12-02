export interface Transaction {
    paid_by: string
    amount: number
    participants: string[]
}

export interface Debt {
    from: string
    to: string
    amount: number
}

export function simplifyDebts(transactions: Transaction[]): Debt[] {
    console.log('🔍 Starting pairwise debt calculation with', transactions.length, 'transactions')

    // Step 1: Calculate pairwise debts (who owes whom directly from transactions)
    const pairwiseDebts = new Map<string, Map<string, number>>()

    const addDebt = (debtor: string, creditor: string, amount: number) => {
        if (!pairwiseDebts.has(debtor)) {
            pairwiseDebts.set(debtor, new Map())
        }
        const debtorMap = pairwiseDebts.get(debtor)!
        debtorMap.set(creditor, (debtorMap.get(creditor) || 0) + amount)
    }

    transactions.forEach((t, idx) => {
        if (!t.participants || t.participants.length === 0) return

        const splitAmount = t.amount / t.participants.length

        // Each participant (except payer) owes their share to the payer
        t.participants.forEach(participant => {
            if (participant !== t.paid_by) {
                addDebt(participant, t.paid_by, splitAmount)
            }
        })

        if (idx < 3 || idx >= transactions.length - 3) {
            console.log(`📝 Transaction ${idx + 1}: ${t.paid_by} paid ${t.amount} for ${t.participants.length} people`)
        }
    })

    console.log('\n💰 Pairwise debts (before consolidation):')
    pairwiseDebts.forEach((creditors, debtor) => {
        creditors.forEach((amount, creditor) => {
            console.log(`  ${debtor} → ${creditor}: ${amount.toFixed(2)}`)
        })
    })

    // Step 2: Consolidate bidirectional debts (net out A→B and B→A)
    console.log('\n🔄 Consolidating bidirectional debts...')
    const processedPairs = new Set<string>()

    pairwiseDebts.forEach((creditorsA, debtorA) => {
        creditorsA.forEach((amountAtoB, creditorB) => {
            const pairKey = [debtorA, creditorB].sort().join('→')
            if (processedPairs.has(pairKey)) return
            processedPairs.add(pairKey)

            // Check if B also owes A
            const debtBtoA = pairwiseDebts.get(creditorB)?.get(debtorA) || 0

            if (debtBtoA > 0) {
                // Bidirectional debt exists, consolidate
                const netAmount = Math.abs(amountAtoB - debtBtoA)
                const netDebtor = amountAtoB > debtBtoA ? debtorA : creditorB
                const netCreditor = amountAtoB > debtBtoA ? creditorB : debtorA

                console.log(`  Consolidating ${debtorA}↔${creditorB}: ${amountAtoB.toFixed(2)} vs ${debtBtoA.toFixed(2)} = ${netDebtor}→${netCreditor}: ${netAmount.toFixed(2)}`)

                // Update the debt maps
                creditorsA.set(creditorB, amountAtoB > debtBtoA ? netAmount : 0)
                if (pairwiseDebts.has(creditorB)) {
                    pairwiseDebts.get(creditorB)!.set(debtorA, debtBtoA > amountAtoB ? netAmount : 0)
                }
            }
        })
    })

    // Remove zero debts
    pairwiseDebts.forEach((creditors, debtor) => {
        creditors.forEach((amount, creditor) => {
            if (amount < 0.01) {
                creditors.delete(creditor)
            }
        })
        if (creditors.size === 0) {
            pairwiseDebts.delete(debtor)
        }
    })

    console.log('\n💚 Net pairwise debts (after consolidation):')
    pairwiseDebts.forEach((creditors, debtor) => {
        creditors.forEach((amount, creditor) => {
            console.log(`  ${debtor} → ${creditor}: ${amount.toFixed(2)}`)
        })
    })

    // Step 3: Detect and simplify chains (A→B→C becomes A→C)
    console.log('\n🔗 Detecting and simplifying debt chains...')
    let chainsFound = 0

    // Keep simplifying until no more chains are found
    let simplified = true
    while (simplified) {
        simplified = false

        // Look for pattern: A owes B, B owes C
        for (const [debtorA, creditorsOfA] of pairwiseDebts) {
            for (const [intermediaryB, amountAtoB] of creditorsOfA) {
                // Check if B owes anyone (B→C)
                const creditorsOfB = pairwiseDebts.get(intermediaryB)
                if (!creditorsOfB || creditorsOfB.size === 0) continue

                for (const [creditorC, amountBtoC] of creditorsOfB) {
                    // Found chain: A→B→C
                    if (creditorC === debtorA) continue // Skip cycles

                    const transferAmount = Math.min(amountAtoB, amountBtoC)
                    if (transferAmount < 0.01) continue

                    chainsFound++
                    console.log(`  Chain ${chainsFound}: ${debtorA}→${intermediaryB}→${creditorC} (transfer ${transferAmount.toFixed(2)})`)

                    // Transfer debt: A now owes C directly
                    addDebt(debtorA, creditorC, transferAmount)

                    // Reduce A→B and B→C
                    creditorsOfA.set(intermediaryB, amountAtoB - transferAmount)
                    creditorsOfB.set(creditorC, amountBtoC - transferAmount)

                    // Clean up zeros
                    if (creditorsOfA.get(intermediaryB)! < 0.01) creditorsOfA.delete(intermediaryB)
                    if (creditorsOfB.get(creditorC)! < 0.01) creditorsOfB.delete(creditorC)
                    if (creditorsOfA.size === 0) pairwiseDebts.delete(debtorA)
                    if (creditorsOfB.size === 0) pairwiseDebts.delete(intermediaryB)

                    simplified = true
                    break
                }
                if (simplified) break
            }
            if (simplified) break
        }
    }

    console.log(`  Found and simplified ${chainsFound} chains`)

    // Step 4: Convert to Debt array
    const result: Debt[] = []

    pairwiseDebts.forEach((creditors, debtor) => {
        creditors.forEach((amount, creditor) => {
            if (amount >= 0.01) {
                result.push({
                    from: debtor,
                    to: creditor,
                    amount: Number(amount.toFixed(2))
                })
            }
        })
    })

    console.log('\n✅ FINAL SIMPLIFIED DEBTS:')
    result.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.from} → ${d.to}: R$ ${d.amount.toFixed(2)}`)
    })

    return result
}
