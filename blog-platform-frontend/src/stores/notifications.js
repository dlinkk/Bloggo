import { reactive } from 'vue'

const notifications = reactive([])
let seed = 0

const removeById = (id) => {
    const index = notifications.findIndex((item) => item.id === id)
    if (index !== -1) notifications.splice(index, 1)
}

const push = ({ message, type = 'info', timeout = 4000 }) => {
    if (!message) return
    const id = ++seed
    const entry = { id, message, type }
    notifications.push(entry)
    if (timeout > 0) {
        setTimeout(() => removeById(id), timeout)
    }
    return id
}

export const useNotifications = () => notifications
export const notify = (message, options = {}) => push({ message, ...options })
export const notifySuccess = (message, options = {}) => push({ message, type: 'success', ...options })
export const notifyError = (message, options = {}) => push({ message, type: 'error', ...options })
export const notifyInfo = (message, options = {}) => push({ message, type: 'info', ...options })
export const dismissNotification = (id) => removeById(id)
