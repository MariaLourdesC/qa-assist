Feature: Autenticacion de usuarios bancarios

Background:
  Given el usuario tiene una cuenta registrada y activa
  And el sistema tiene habilitado el bloqueo por intentos fallidos

Scenario: Login exitoso con credenciales validas
  Given el usuario ingresa su email y contrasena correctos
  When hace clic en el boton iniciar sesion
  Then el sistema valida las credenciales contra la base de datos
  And crea una sesion autenticada con token JWT
  And redirige al dashboard del usuario

Scenario: Bloqueo tras multiples intentos fallidos
  Given el usuario tiene 4 intentos fallidos previos
  When ingresa una contrasena incorrecta por quinta vez
  Then el sistema bloquea la cuenta por 15 minutos
  And muestra un mensaje de error especifico
  And registra el evento en el log de auditoria

Scenario: Recuperacion de contrasena
  Given el usuario no recuerda su contrasena
  When solicita recuperacion via email
  Then el sistema envia un correo con enlace de recuperacion valido por 30 minutos
  And el enlace expira automaticamente
