# Settlement Lock Flow (Pseudocode)

This flow defines how a weekly driver settlement is finalized and paid.

```python
def lock_driver_week(driver_id, week_end_date, authorized_by):
    # 1. Get all PENDING items for this driver and week
    items = SettlementItem.where(driver_id=driver_id,
                                 week_end_date=week_end_date,
                                 status='PENDING')

    # 2. Calculate totals
    total_haul = sum(item.calculated_amount for item in items)
    adjustments = Adjustment.where(driver_id=driver_id, week=week_end_date)
    net_pay = total_haul + adjustments.bonus_total - adjustments.deduction_total

    # 3. Create FINAL SETTLEMENT record
    final_settlement = FinalSettlement.create({
        'driver_id': driver_id,
        'week_end_date': week_end_date,
        'total_haul': total_haul,
        'total_adjustments': adjustments.total,
        'net_pay': net_pay,
        'locked_by': authorized_by,
        'locked_at': datetime.now()
    })

    # 4. Update all items to PAID and link to final settlement
    for item in items:
        item.update(status='PAID', final_settlement_id=final_settlement.id)

    # 5. Generate payroll entry
    payroll_entry = {
        'driver_name': get_driver_name(driver_id),
        'employee_id': get_driver_employee_id(driver_id),
        'net_pay': net_pay,
        'pay_date': week_end_date,
        'settlement_id': final_settlement.id
    }

    # 6. Export to accounting system (example: QuickBooks)
    quickbooks_api.create_check(payroll_entry)

    # 7. Notify driver
    send_notification(driver_id,
        f"Your settlement for {week_end_date} is finalized. Net pay: ${net_pay:.2f}")

    return final_settlement
```
