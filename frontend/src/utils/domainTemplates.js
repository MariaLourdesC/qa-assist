// Plantillas por dominio: glosario + reglas de negocio típicas.
// Bilingüe: el contenido se sirve en el idioma activo.

const TEMPLATES = {
  banking: {
    es: {
      glossary: [
        { termino: 'KYC', definicion: 'Know Your Customer: validación de identidad del cliente.' },
        { termino: 'AML', definicion: 'Anti-Money Laundering: prevención de lavado de dinero.' },
        { termino: 'PCI DSS', definicion: 'Payment Card Industry Data Security Standard.' },
        { termino: 'CVV', definicion: 'Card Verification Value, código de seguridad de la tarjeta.' },
        { termino: '2FA', definicion: 'Autenticación de dos factores.' },
        { termino: 'IBAN', definicion: 'International Bank Account Number.' },
        { termino: 'Tasa de cambio', definicion: 'Valor de conversión entre divisas en tiempo real.' }
      ],
      rules: [
        { regla: 'Toda transacción mayor a $10,000 USD requiere aprobación adicional', tipo: 'restriccion' },
        { regla: 'Bloquear cuenta tras 5 intentos fallidos de autenticación', tipo: 'seguridad' },
        { regla: 'Datos de tarjeta deben cifrarse en tránsito y en reposo (PCI DSS)', tipo: 'seguridad' },
        { regla: 'Toda operación monetaria debe ser idempotente', tipo: 'restriccion' },
        { regla: 'Auditar y persistir logs de toda operación financiera', tipo: 'auditoria' },
        { regla: 'Validar identidad del cliente (KYC) antes de cualquier transacción', tipo: 'cumplimiento' }
      ]
    },
    en: {
      glossary: [
        { termino: 'KYC', definicion: 'Know Your Customer: customer identity validation.' },
        { termino: 'AML', definicion: 'Anti-Money Laundering controls.' },
        { termino: 'PCI DSS', definicion: 'Payment Card Industry Data Security Standard.' },
        { termino: 'CVV', definicion: 'Card Verification Value security code.' },
        { termino: '2FA', definicion: 'Two-factor authentication.' },
        { termino: 'IBAN', definicion: 'International Bank Account Number.' },
        { termino: 'Exchange rate', definicion: 'Real-time conversion value between currencies.' }
      ],
      rules: [
        { regla: 'Any transaction above $10,000 USD requires additional approval', tipo: 'restriccion' },
        { regla: 'Lock account after 5 failed authentication attempts', tipo: 'seguridad' },
        { regla: 'Card data must be encrypted in transit and at rest (PCI DSS)', tipo: 'seguridad' },
        { regla: 'Every monetary operation must be idempotent', tipo: 'restriccion' },
        { regla: 'Audit and persist logs of every financial operation', tipo: 'auditoria' },
        { regla: 'Validate customer identity (KYC) before any transaction', tipo: 'cumplimiento' }
      ]
    }
  },
  ecommerce: {
    es: {
      glossary: [
        { termino: 'SKU', definicion: 'Stock Keeping Unit, identificador único de producto.' },
        { termino: 'Carrito', definicion: 'Listado de productos seleccionados antes del checkout.' },
        { termino: 'Checkout', definicion: 'Proceso de pago y confirmación de compra.' },
        { termino: 'Stock', definicion: 'Inventario disponible por producto y variante.' },
        { termino: 'Pasarela de pago', definicion: 'Servicio externo que procesa la transacción de pago.' },
        { termino: 'RMA', definicion: 'Return Merchandise Authorization, autorización de devolución.' }
      ],
      rules: [
        { regla: 'No permitir compras de productos con stock 0', tipo: 'restriccion' },
        { regla: 'Reservar stock al iniciar checkout y liberar tras timeout configurable', tipo: 'restriccion' },
        { regla: 'Política de devoluciones máxima de 30 días desde la compra', tipo: 'restriccion' },
        { regla: 'Datos de tarjeta nunca tocan nuestro servidor (tokenización via gateway)', tipo: 'seguridad' },
        { regla: 'Confirmar email al cliente tras compra exitosa', tipo: 'comunicacion' },
        { regla: 'Validar stock real al confirmar el pago, no solo al agregar al carrito', tipo: 'restriccion' }
      ]
    },
    en: {
      glossary: [
        { termino: 'SKU', definicion: 'Stock Keeping Unit, unique product identifier.' },
        { termino: 'Cart', definicion: 'List of selected products before checkout.' },
        { termino: 'Checkout', definicion: 'Payment and purchase confirmation process.' },
        { termino: 'Stock', definicion: 'Available inventory per product and variant.' },
        { termino: 'Payment gateway', definicion: 'External service that processes the payment transaction.' },
        { termino: 'RMA', definicion: 'Return Merchandise Authorization.' }
      ],
      rules: [
        { regla: 'Do not allow purchases of products with stock 0', tipo: 'restriccion' },
        { regla: 'Reserve stock at checkout start and release after configurable timeout', tipo: 'restriccion' },
        { regla: 'Maximum return policy of 30 days from purchase', tipo: 'restriccion' },
        { regla: 'Card data never touches our server (tokenization via gateway)', tipo: 'seguridad' },
        { regla: 'Confirm by email to the customer after successful purchase', tipo: 'comunicacion' },
        { regla: 'Validate real stock at payment confirmation, not just at add-to-cart', tipo: 'restriccion' }
      ]
    }
  },
  healthcare: {
    es: {
      glossary: [
        { termino: 'HIPAA', definicion: 'Health Insurance Portability and Accountability Act (US).' },
        { termino: 'PHI', definicion: 'Protected Health Information, datos de salud protegidos.' },
        { termino: 'Historia clínica', definicion: 'Registro médico completo del paciente.' },
        { termino: 'Anonimización', definicion: 'Proceso de remover identificadores personales de datos.' },
        { termino: 'Consentimiento informado', definicion: 'Autorización del paciente para uso de sus datos.' }
      ],
      rules: [
        { regla: 'Datos de salud (PHI) deben cifrarse en tránsito y reposo (HIPAA)', tipo: 'cumplimiento' },
        { regla: 'Acceso a historia clínica solo por personal autorizado y con auditoría', tipo: 'seguridad' },
        { regla: 'Anonimizar datos antes de uso analítico o investigación', tipo: 'cumplimiento' },
        { regla: 'Registrar consentimiento informado antes de procesar PHI', tipo: 'cumplimiento' },
        { regla: 'Backup cifrado y retención de mínimo 7 años', tipo: 'cumplimiento' }
      ]
    },
    en: {
      glossary: [
        { termino: 'HIPAA', definicion: 'Health Insurance Portability and Accountability Act (US).' },
        { termino: 'PHI', definicion: 'Protected Health Information.' },
        { termino: 'Medical record', definicion: 'Complete patient medical history.' },
        { termino: 'Anonymization', definicion: 'Process of removing personal identifiers from data.' },
        { termino: 'Informed consent', definicion: 'Patient authorization for use of their data.' }
      ],
      rules: [
        { regla: 'PHI must be encrypted in transit and at rest (HIPAA)', tipo: 'cumplimiento' },
        { regla: 'Medical record access only by authorized staff and with auditing', tipo: 'seguridad' },
        { regla: 'Anonymize data before analytical or research use', tipo: 'cumplimiento' },
        { regla: 'Record informed consent before processing PHI', tipo: 'cumplimiento' },
        { regla: 'Encrypted backups and minimum 7-year retention', tipo: 'cumplimiento' }
      ]
    }
  },
  saas: {
    es: {
      glossary: [
        { termino: 'Tenant', definicion: 'Organización cliente con sus datos aislados.' },
        { termino: 'Multi-tenancy', definicion: 'Arquitectura donde una sola instancia sirve a múltiples tenants.' },
        { termino: 'Plan', definicion: 'Nivel de suscripción con límites y features asociados.' },
        { termino: 'Quota', definicion: 'Límite de recursos asignado a un tenant según su plan.' },
        { termino: 'API key', definicion: 'Token de autenticación para acceso programático.' }
      ],
      rules: [
        { regla: 'Aislamiento estricto de datos entre tenants en todas las queries', tipo: 'seguridad' },
        { regla: 'Endpoints públicos deben tener rate limiting por tenant', tipo: 'restriccion' },
        { regla: 'Notificar al admin del tenant ante quotas excedidas', tipo: 'comunicacion' },
        { regla: 'Soft-delete con retención de 30 días para recuperación', tipo: 'restriccion' },
        { regla: 'Cancelación de suscripción no elimina datos hasta el fin del período pagado', tipo: 'restriccion' }
      ]
    },
    en: {
      glossary: [
        { termino: 'Tenant', definicion: 'Client organization with isolated data.' },
        { termino: 'Multi-tenancy', definicion: 'Architecture where a single instance serves multiple tenants.' },
        { termino: 'Plan', definicion: 'Subscription tier with associated limits and features.' },
        { termino: 'Quota', definicion: 'Resource limit assigned to a tenant per plan.' },
        { termino: 'API key', definicion: 'Authentication token for programmatic access.' }
      ],
      rules: [
        { regla: 'Strict data isolation between tenants in all queries', tipo: 'seguridad' },
        { regla: 'Public endpoints must have rate limiting per tenant', tipo: 'restriccion' },
        { regla: 'Notify tenant admin when quotas are exceeded', tipo: 'comunicacion' },
        { regla: 'Soft-delete with 30-day retention for recovery', tipo: 'restriccion' },
        { regla: 'Subscription cancellation does not delete data until end of paid period', tipo: 'restriccion' }
      ]
    }
  },
  education: {
    es: {
      glossary: [
        { termino: 'LMS', definicion: 'Learning Management System.' },
        { termino: 'Cohorte', definicion: 'Grupo de alumnos que toma el curso al mismo tiempo.' },
        { termino: 'Inscripción', definicion: 'Acción de registrar un alumno en un curso.' },
        { termino: 'Progreso', definicion: 'Porcentaje completado de un curso por alumno.' }
      ],
      rules: [
        { regla: 'Alumnos menores de edad requieren consentimiento del tutor', tipo: 'cumplimiento' },
        { regla: 'Persistir progreso después de cada lección completada', tipo: 'restriccion' },
        { regla: 'Certificados emitidos solo al completar 100% del curso y aprobar evaluación', tipo: 'restriccion' }
      ]
    },
    en: {
      glossary: [
        { termino: 'LMS', definicion: 'Learning Management System.' },
        { termino: 'Cohort', definicion: 'Group of students taking the course at the same time.' },
        { termino: 'Enrollment', definicion: 'Action of registering a student in a course.' },
        { termino: 'Progress', definicion: 'Percentage of a course completed by a student.' }
      ],
      rules: [
        { regla: 'Underage students require guardian consent', tipo: 'cumplimiento' },
        { regla: 'Persist progress after each completed lesson', tipo: 'restriccion' },
        { regla: 'Certificates issued only when 100% of course is complete and evaluation passed', tipo: 'restriccion' }
      ]
    }
  },
  logistics: {
    es: {
      glossary: [
        { termino: 'SKU', definicion: 'Stock Keeping Unit.' },
        { termino: 'Tracking', definicion: 'Seguimiento del envío en tiempo real.' },
        { termino: 'Última milla', definicion: 'Tramo final del envío hasta el destinatario.' },
        { termino: 'POD', definicion: 'Proof of Delivery, comprobante de entrega.' }
      ],
      rules: [
        { regla: 'Cada envío debe tener un tracking único y trazable', tipo: 'restriccion' },
        { regla: 'Notificar al destinatario en cada cambio de estado del envío', tipo: 'comunicacion' },
        { regla: 'POD requerido antes de marcar entrega como completada', tipo: 'restriccion' },
        { regla: 'Reintentar entrega máximo 3 veces antes de devolver al origen', tipo: 'restriccion' }
      ]
    },
    en: {
      glossary: [
        { termino: 'SKU', definicion: 'Stock Keeping Unit.' },
        { termino: 'Tracking', definicion: 'Real-time shipment monitoring.' },
        { termino: 'Last mile', definicion: 'Final leg of shipment to the recipient.' },
        { termino: 'POD', definicion: 'Proof of Delivery.' }
      ],
      rules: [
        { regla: 'Every shipment must have a unique and traceable tracking', tipo: 'restriccion' },
        { regla: 'Notify recipient on each shipment status change', tipo: 'comunicacion' },
        { regla: 'POD required before marking delivery as completed', tipo: 'restriccion' },
        { regla: 'Retry delivery max 3 times before returning to origin', tipo: 'restriccion' }
      ]
    }
  }
};

export const DOMAIN_KEYS = Object.keys(TEMPLATES);

export function getTemplate(domain, lang = 'es') {
  const t = TEMPLATES[domain];
  if (!t) return null;
  return t[lang] || t.es;
}
