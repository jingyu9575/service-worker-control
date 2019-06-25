serviceWorkerPreload(MESSAGE_URL, false)

const consentMap = new Map()

async function getRegistrations() {
	return (await navigator.serviceWorker.getRegistrations()).map(reg => {
		const state = ['installing', 'waiting', 'active'].find(v => reg[v])
		return state && { url: reg[state].scriptURL, scope: reg.scope }
	}).filter(v => v)
}

async function getAllRegistrations() {
	return [
		...await getRegistrations(),
		...[...consentMap.values()].map(v => v.registration).filter(r => r.pending)
	]
}

void function () {
	function update() { browser.runtime.sendMessage({ type: 'update' }) }

	function regKey(reg) { return reg.url + '\n' + reg.scope }

	exportFunction(function (scriptURL, options) {
		return window.Promise.resolve((async () => {
			const { requireConsent } = await browser.storage.local.get('requireConsent')
			if (requireConsent) {
				const url = new URL(scriptURL, location).href
				const registration = {
					url,
					scope: options && options.scope ?
						new URL(options.scope, location).href :
						new URL('.', url).href,
					pending: true,
				}
				const key = regKey(registration)
				if (!(await getRegistrations()).some(v => regKey(v) === key)) {
					let consent = consentMap.get(key)
					if (!consent) {
						consent = { registration }
						consent.promise = new Promise((resolve, reject) => {
							consent.resolve = resolve
							consent.reject = reject
						})
						consentMap.set(key, consent)
						update()
					}
					await consent.promise
				}
			}
			const result = await ServiceWorkerContainer.prototype.register
				.apply(this, arguments)
			update()
			return result
		})())
	}, ServiceWorkerContainer.prototype, { defineAs: 'register' })

	exportFunction(function () {
		return window.Promise.resolve((async () => {
			const result = await ServiceWorkerRegistration.prototype.unregister
				.apply(this, arguments)
			update()
			return result
		})())
	}, ServiceWorkerRegistration.prototype, { defineAs: 'unregister' })

	update()

	browser.runtime.onMessage.addListener(async message => {
		if (message.type === 'unregister') {
			let unregistered = false
			for (const reg of await navigator.serviceWorker.getRegistrations()) {
				if (reg.scope !== message.scope) continue
				const sw = reg.installing || reg.waiting || reg.active || {}
				if (sw.scriptURL !== message.url) continue
				try {
					if (await reg.unregister()) unregistered = true
				} catch { }
			}
			if (unregistered) update()
		} else if (message.type === 'allow' || message.type === 'deny') {
			const consent = consentMap.get(regKey(message))
			if (!consent) return
			consent.registration.pending = false
			if (message.type === 'allow')
				consent.resolve()
			else
				consent.reject(new window.TypeError(
					'ServiceWorker registration denied by the user.'))
			update()
		}
	})
}()
