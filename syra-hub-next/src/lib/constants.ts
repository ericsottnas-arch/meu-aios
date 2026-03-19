export const SECTIONS = [
  { id: 'dashboard',     name: 'Dashboard',      icon: 'LayoutDashboard' },
  { id: 'agentes',       name: 'Agentes',        icon: 'Bot' },
  { id: 'clientes',      name: 'Clientes',       icon: 'Users' },
  { id: 'calendario',    name: 'Calendário',     icon: 'Calendar' },
  { id: 'inbox',         name: 'Inbox',          icon: 'Inbox' },
  { id: 'prospeccao',    name: 'Prospecção',     icon: 'Target' },
  { id: 'midia',         name: 'Mídia Paga',     icon: 'BarChart3' },
  { id: 'financeiro',    name: 'Financeiro',     icon: 'Wallet' },
  { id: 'docs',          name: 'Documentação',   icon: 'FileText' },
  { id: 'integracoes',   name: 'Integrações',    icon: 'Plug' },
  { id: 'design-system', name: 'Design System',  icon: 'Palette' },
  { id: 'config',        name: 'Configurações',  icon: 'Settings' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

export const SERVICES = [
  {
    id: 'nico-whatsapp',
    name: 'NICO',
    label: 'WhatsApp Monitor',
    port: 3001,
    icon: 'MessageCircle',
    color: '#25D366',
  },
  {
    id: 'celo',
    name: 'CELO',
    label: 'Media Buyer',
    port: 3002,
    icon: 'TrendingUp',
    color: '#FF6B35',
  },
  {
    id: 'alex',
    name: 'ALEX',
    label: 'Project Manager',
    port: 3003,
    icon: 'ClipboardList',
    color: '#5B8DEF',
  },
  {
    id: 'ghl-webhook',
    name: 'GHL',
    label: 'Webhook Server',
    port: 3004,
    icon: 'Zap',
    color: '#FF9800',
  },
  {
    id: 'iris',
    name: 'IRIS',
    label: 'Prospecção',
    port: 3005,
    icon: 'Target',
    color: '#AB47BC',
  },
  {
    id: 'cold-outreach',
    name: 'COLD',
    label: 'Cold Outreach',
    port: 3006,
    icon: 'Mail',
    color: '#26C6DA',
  },
  {
    id: 'swipe-collector',
    name: 'SWIPE',
    label: 'Swipe File',
    port: 3007,
    icon: 'Bookmark',
    color: '#42A5F5',
  },
  {
    id: 'syra-hub',
    name: 'HUB',
    label: 'Syra Hub (legacy)',
    port: 3008,
    icon: 'Layout',
    color: '#C8FF00',
  },
] as const

// Client-only sections (hidden from client users)
export const ADMIN_ONLY_SECTIONS: SectionId[] = [
  'agentes',
  'prospeccao',
  'financeiro',
  'config',
  'integracoes',
  'design-system',
]
