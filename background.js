browser.runtime.onMessage.addListener((message, { tab }) => {
	if (message.type === 'update') {
		updateTab(tab.id)
		browser.runtime.sendMessage({ type: 'updatePopup', tabId: tab.id })
	}
})

const iconCache = {}

async function getIcon(path) {
	let color
	try {
		// Not needing `theme` permission [Firefox 62]
		const { colors } = await browser.theme.getCurrent()
		if (colors) {
			const c = colors.icons || colors.toolbar_text || colors.bookmark_text
			color = Array.isArray(c) ?
				`${'rgba'.slice(0, c.length)}(${c.join(',')})` : c
		}
	} catch { }
	if (!color) return { path }

	const key = `${path}__${color}`
	if (iconCache[key]) return iconCache[key]

	const xml = await (await fetch(path)).text()
	const node = new DOMParser().parseFromString(xml, 'image/svg+xml').documentElement

	// toolbar/menupanel icon size is always 16 * devicePixelRatio [Firefox 68.0b5]
	const SIZE_PX = 16
	const size = Math.ceil(SIZE_PX * devicePixelRatio)
	const img = new Image(size, size)
	node.style.fill = color
	node.setAttribute('width', '' + size)
	node.setAttribute('height', '' + size)

	await new Promise(resolve => {
		img.addEventListener('load', resolve)
		img.src = "data:image/svg+xml," + encodeURIComponent(node.outerHTML)
	})
	img.width = size
	img.height = size

	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const context = canvas.getContext('2d')
	context.imageSmoothingEnabled = false
	context.drawImage(img, 0, 0)
	return { imageData: { [SIZE_PX]: context.getImageData(0, 0, size, size) } }
}

async function updateTab(tabId) {
	const all = await getAllRegistrations(tabId)
	const pendings = all.filter(v => v.pending)
	browser.pageAction.setTitle({
		tabId,
		title: !all.length ? browser.i18n.getMessage('zeroRegistered') :
			!pendings.length ? browser.i18n.getMessage('nRegistered', [all.length]) :
				browser.i18n.getMessage('nRegisteredNPending',
					[all.length - pendings.length, pendings.length])
	})
	browser.pageAction.setIcon(Object.assign({ tabId },
		await getIcon(`icons/icon${pendings.length ? "-pending" : ""}.svg`)))
	browser.pageAction[all.length ? 'show' : 'hide'](tabId)
}

function updateAllTabs() {
	browser.tabs.query({ windowType: "normal" }).then(tabs => {
		for (const { id } of tabs) updateTab(id).catch(() => { })
	})
}
updateAllTabs()

// Not needing `theme` permission [Firefox 62]
try { browser.theme.onUpdated.addListener(updateAllTabs) } catch { }

const swPreloadBuffer = new TextEncoder().encode(
	`;(${serviceWorkerPreload})(${JSON.stringify(MESSAGE_URL)}, true);\n`)

browser.webRequest.onBeforeRequest.addListener(async (
	{ originUrl, requestBody: { raw }, timeStamp }) => {
	try {
		const message = JSON.parse(new TextDecoder().decode(raw[0].bytes))
		if (message.type === 'notification') try {
			if (!(await browser.storage.local.get(
				'enableNotificationHistory')).enableNotificationHistory)
				return
			if (message.isInjected) message.url = originUrl
			delete message.type
			message.timeStamp = timeStamp
			void (await notificationStorage).set(undefined, message)
		} catch (error) { console.error(error) }
	} finally { return { cancel: true } }
}, { urls: [MESSAGE_URL], types: ['xmlhttprequest'], tabId: -1 },
	['requestBody', 'blocking'])

async function onSWHeadersReceived({ statusCode, incognito, requestId }) {
	if (!(statusCode >= 200 && statusCode < 300) || incognito) return
	const filter = browser.webRequest.filterResponseData(requestId)
	filter.onstart = () => {
		filter.write(swPreloadBuffer)
		filter.disconnect()
	}
	return {}
}

async function updateEnableNotificationHistory() {
	if ((await browser.storage.local.get(
		'enableNotificationHistory')).enableNotificationHistory) {
		browser.webRequest.onHeadersReceived.addListener(onSWHeadersReceived,
			{ urls: ['<all_urls>'], types: ['script'], tabId: -1 }, ["blocking"])
	} else {
		browser.webRequest.onHeadersReceived.removeListener(onSWHeadersReceived)
	}
}
void updateEnableNotificationHistory()
browser.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'local') return
	if ('enableNotificationHistory' in changes) {
		updateEnableNotificationHistory()
	}
})

browser.runtime.onMessageExternal.addListener(message => {
	try {
		if (typeof message !== 'object' || !message) return
		if (message.type === 'open-notifications-history') {
			browser.tabs.create(
				{ url: browser.runtime.getURL('notifications-history.html') })
			return Promise.resolve(true)
		}
	} catch (error) { console.error(error) }
})