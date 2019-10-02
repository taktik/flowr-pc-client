export interface Contact {
  name: string
  phoneNumber: string
}

export interface History {
  timestamp: number
  phoneNumber: string
}

interface PhoneStoreProps {
  history: History[]
  contacts: Contact[]
}

export const defaultPhoneStoreProps: PhoneStoreProps = { history: [], contacts: [] }
