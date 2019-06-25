var MESSAGE_URL = 'https://' + new URL(browser.runtime.getURL('/')).host +
	'.service-worker-control.qw.invalid/'

function serviceWorkerPreload(messageURL, isInjected) {
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