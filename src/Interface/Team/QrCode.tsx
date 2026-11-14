import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function QrCode({ value, label }: { value: string; label: string }) {
  const [source, setSource] = useState<string>()
  useEffect(() => {
    void QRCode.toDataURL(value, { margin: 1, width: 320, color: { dark: '#0b1020', light: '#ffffff' } }).then(setSource)
  }, [value])
  return source ? <img className="QrCode" src={source} alt={label} width={220} height={220} /> : <div className="QrCode" />
}
