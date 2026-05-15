Feature: Validacion de montos de transferencia

Scenario Outline: Transferencia con <moneda>
  Given el usuario autenticado tiene saldo en <moneda>
  When intenta transferir <monto>
  Then el sistema <resultado>

Examples:
  | moneda | monto  | resultado                        |
  | USD    | 100    | aprueba la transaccion           |
  | EUR    | 50     | aprueba la transaccion           |
  | ARS    | 999999 | rechaza por monto fuera de limite |
