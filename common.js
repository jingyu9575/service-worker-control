function applyI18n(node = document) {
	for (const v of node.querySelectorAll('[data-i18n]'))
		v.innerText = browser.i18n.getMessage(v.dataset['i18n'])
}

async function getAllRegistrations(tabId) {
	const uniqueSet = new Set()
	return [].concat(...await browser.tabs.executeScript(tabId, {
		code: 'getAllRegistrations()',
		runAt: 'document_start',
		allFrames: true,
	})).filter(reg => {
		const key = (reg.pending ? 1 : 0) + reg.url + '\n' + reg.scope
		if (uniqueSet.has(key)) return false
		uniqueSet.add(key)
		return true
	})
}