let currentTabId = undefined

browser.runtime.onMessage.addListener(async message => {
	if (message.type === 'updatePopup' && message.tabId === currentTabId) {
		location.reload()
	}
})

applyI18n()

void async function () {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
	if (!tab) return
	currentTabId = tab.id
	const swTemplate = document.getElementById('service-worker-template')
	const isWindows = (await browser.runtime.getPlatformInfo()).os === 'win'
	for (const reg of await getAllRegistrations(tab.id)) {
		const { url, scope, pending } = reg
		const node = document.importNode(swTemplate.content, true).firstElementChild
		applyI18n(node)
		node.querySelector('.url').textContent = url
		node.querySelector('.scope').textContent = scope
		if (pending) node.classList.add('pending')
		document.getElementById('service-workers').appendChild(node)

		node.querySelector('.unregister').addEventListener('click', event => {
			event.preventDefault()
			browser.tabs.sendMessage(tab.id, { type: 'unregister', url, scope })
		})
		const allow = node.querySelector('.allow'), deny = node.querySelector('.deny')
		allow.addEventListener('click', () => {
			browser.tabs.sendMessage(tab.id, { type: 'allow', url, scope })
			close()
		})
		deny.addEventListener('click', () => {
			browser.tabs.sendMessage(tab.id, { type: 'deny', url, scope })
			close()
		})
		if (isWindows) deny.parentNode.insertBefore(allow, deny)
	}
}()