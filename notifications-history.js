applyI18n()

document.title += ' - ' + browser.i18n.getMessage('extensionName')

const noStorageAccess = document.getElementById('no-storage-access')
const tbody = document.querySelector('tbody')

void async function () {
	let notifications
	try {
		storage = await notificationStorage
		notifications = await storage.getAll()
	} catch {
		noStorageAccess.hidden = false
	}

	for (let i = notifications.length; i-- > 0;) {
		const v = notifications[i]
		const node = document.createElement('tr')
		for (const s of [
			new Date(v.timeStamp).toLocaleString(undefined, { hour12: false }),
			v.title || '', v.body || '', v.url || '', v.scope || '',
		]) {
			node.appendChild(Object.assign(document.createElement('td'),
				{ textContent: s, title: s }))
		}
		tbody.appendChild(node)
	}
}()