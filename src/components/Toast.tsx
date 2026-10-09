import { Icon } from './Icon'

export interface ToastMessage {
  type: 'success' | 'error'
  text: string
}

export function Toast({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  return <div className={`toast toast-${message.type}`} role="status"><span className="toast-mark"><Icon name={message.type === 'success' ? 'check' : 'alert'} /></span><span>{message.text}</span><button className="icon-button toast-close" onClick={onClose} aria-label="Fechar notificação"><Icon name="close" /></button></div>
}
