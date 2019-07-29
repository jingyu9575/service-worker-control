var MESSAGE_URL = 'https://' + new URL(browser.runtime.getURL('/')).host +
	'.service-worker-control.qw.invalid/'

function serviceWorkerPreload(messageURL, isInjected) {
	/* use non-strict (requires global this) */
	const flag = '__service-worker-control.qw.794aaa1d-a9db-4f14-9e9c-2fb8d7931d24'
	if (typeof this[flag] !== 'undefined') return
	Object.defineProperty(this, flag,
		{ value: true, configurable: false, enumerable: false })

	function send(message) {
		void fetch(messageURL, {
			body: JSON.stringify(message), method: 'POST', mode: 'no-cors'
		})
	}

	const showNotification_0 = ServiceWorkerRegistration.prototype.showNotification
	function showNotification(title, options) {
		const obj = { type: 'notification', isInjected }
		try {
			const sw = this.installing || this.waiting || this.active
			obj.url = typeof sw === 'object' && sw ? '' + sw.scriptURL : undefined
		} catch { }
		try { obj.scope = '' + this.scope } catch { }
		try { obj.title = '' + title } catch { }
		try { obj.body = '' + options.body } catch { }
		send(obj)
		return showNotification_0.apply(this, arguments)
	}

	if (isInjected) {
		ServiceWorkerRegistration.prototype.showNotification = showNotification
	} else {
		exportFunction(showNotification, ServiceWorkerRegistration.prototype,
			{ defineAs: 'showNotification' })
	}
}