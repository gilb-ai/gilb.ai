(() => {
  'use strict';
  const allowedOrigin = origin => /^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+\.)?script\.googleusercontent\.com)$/.test(origin);
  document.querySelectorAll('[data-lead-form]').forEach(form => {
    const status = form.querySelector('.lead-status');
    const submit = form.querySelector('[type=submit]');
    let pending = false;
    let completed = false;
    let timer;
    let lastPayload = '';
    let receipt;
    const say = (message, state) => { status.textContent = message; status.dataset.state = state; };
    const finish = () => { pending = false; clearTimeout(timer); form.removeAttribute('aria-busy'); submit.disabled = false; };
    window.addEventListener('message', event => {
      const data = event.data;
      if (!pending || !allowedOrigin(event.origin) || !data || data.type !== 'gilb-lead-receipt' || data.requestId !== form.elements.requestId.value) return;
      finish();
      if (data.ok === true) {
        completed = true;
        form.reset();
        submit.hidden = true;
        say('Thank you. Your request has been received. We’ll be in touch by email.', 'success');
        status.tabIndex = -1;
        status.focus();
      } else {
        say(data.code === 'invalid' ? 'Please check your name, company size, email and request, then try again.' : 'We couldn’t save your request. Your details are still here; please try again.', 'error');
      }
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (pending || completed || !form.reportValidity()) return;
      const endpoint = window.GILB_LEAD_ENDPOINT || '';
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) {
        say('The request form is temporarily unavailable. Please try again later.', 'error');
        return;
      }
      const payload = ['name','companySize','lookingFor','email','whatsapp'].map(key => form.elements[key].value.trim());
      if (!form.elements.requestId.value || JSON.stringify(payload) !== lastPayload) form.elements.requestId.value = crypto.randomUUID();
      lastPayload = JSON.stringify(payload);
      // Keep the same ID after a timeout: the server deduplicates uncertain retries.
      if (receipt) receipt.remove();
      receipt = document.createElement('iframe');
      receipt.name = 'lead-receipt-' + form.elements.requestId.value;
      receipt.className = 'lead-receipt';
      receipt.title = 'Request delivery confirmation';
      receipt.setAttribute('aria-hidden', 'true');
      form.append(receipt);
      form.action = endpoint;
      form.target = receipt.name;
      pending = true;
      submit.disabled = true;
      form.setAttribute('aria-busy','true');
      say('Sending your request…','pending');
      timer = setTimeout(() => {
        finish();
        say('We haven’t received confirmation yet. Your details are still here. Please try again; the same request won’t be saved twice.', 'error');
      }, 45000);
      HTMLFormElement.prototype.submit.call(form);
    });
  });
})();
