Feature: Transferencia entre cuentas

Background:
  Given el cliente tiene sesion activa
  And su saldo es mayor a 0

Scenario: Transferencia exitosa
  Given el cliente selecciona cuenta origen con saldo suficiente
  When ingresa un monto valido y confirma la operacion
  Then el sistema debita el monto de la cuenta origen
  And acredita el monto en la cuenta destino
  And muestra el comprobante de la transaccion

Scenario: Rechazo por saldo insuficiente
  Given el cliente tiene un saldo de 100 pesos
  When intenta transferir 500 pesos
  Then el sistema muestra un error de saldo insuficiente
  And no realiza ningun debito en la cuenta
  But registra el intento fallido en el log de auditoría
