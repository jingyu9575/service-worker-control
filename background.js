browser.runtime.onMessage.addListener((message, { tab }) => {
	if (message.type === 'update') {
		updateTab(tab.id)
		browser.runtime.sendMessage({ type: 'updatePopup', tabId: tab.id })
	}
})

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
	browser.pageAction.setIcon({
		tabId, path: pendings.length ? "icons/icon-pending.svg" : null
	})
	browser.pageAction[all.length ? 'show' : 'hide'](tabId)
}

browser.tabs.query({ windowType: "normal" }).then(tabs => {
	for (const { id } of tabs) updateTab(id).catch(() => { })
})