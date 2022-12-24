var _cio = _cio || [];
(function() {
    var a,b,c;a=function(f){return function(){_cio.push([f].
    concat(Array.prototype.slice.call(arguments,0)))}};b=["identify",
        "track"];for(c=0;c<b.length;c++){_cio[b[c]]=a(b[c])}
    var t = document.createElement('script'),
        s = document.getElementsByTagName('script')[0];
    t.async = true;
    t.id    = 'cio-tracker';
    t.setAttribute('data-site-id', '36eabec5b31c7f753326');
    t.src = 'https://assets.customer.io/assets/track.js';
    s.parentNode.insertBefore(t, s);
})();

jQuery(document).ready(function($) {
    var KEY_SCHEDULED_IDENTIFY = 'email-signup';
    var scheduled = Cookies.getJSON(KEY_SCHEDULED_IDENTIFY);
    if(scheduled && scheduled.hasOwnProperty('id') && scheduled.hasOwnProperty('email')) {
        // _cio.identify() is *defined*, but not wired up until the script finishes loading... I'm not sure of a better way to handle this. :(
        _cio.identify(scheduled);
        setTimeout(function() {
            _cio.identify(scheduled);
        }, 5000);
    }

    $(".subscribe-form").submit(function handleFormSubmit(ev) {
        function emailIsGood(email) { return email.indexOf('@') > 0 && email.indexOf('.', email.indexOf('@')) > 0; }
        function error(errorText, insertErrorAfterEl) {
            if(insertErrorAfterEl) {
                var $errorDiv = insertErrorAfterEl.parent().find("#email-error");
                if($errorDiv.text()) {
                    $errorDiv.html(errorText);
                } else {
                    insertErrorAfterEl.after('<div class="alert danger email-error" style="padding:0.5em 1em; margin:1em 0;" id="email-error">' + errorText + '</div>')
                }
            }
        }
        function identify(email, plan, insertErrorAfterEl) {
            var t = Math.round(new Date().getTime() / 1000);
            var args = {
                id: email.toLowerCase(),
                email: email.toLowerCase(),
                created_at: t,
                name: "none",
                version: t % 2
            };
            args[plan] = true;
            console.log(args);
            Cookies.set(KEY_SCHEDULED_IDENTIFY, args);
            try {
                _cio.identify(args);
                console.log("Registered", email);
                return true;
            } catch(e) {
                error("Server error registering your email. Please contact X-Plane customer support at <a href=\"mailto:info@x-plane.com\">info@x-plane.com</a> to resolve this issue.", insertErrorAfterEl);
                console.error(e);
                return false;
            }
        }

        var $this = jQuery(this);
        var emailEl = $this.find(".subscribe-input");
        var email = emailEl.val();
        var plan = $this.find(".form-type").val();
        if(emailIsGood(email)) {
            if(identify(email, plan, $this)) {
                $this.hide();
                var $parent = $this.closest('.email-container');

                // Clear no longer useful divs
                $parent.find('.email-error').remove();
                $parent.find('.email-block-subheading').empty();

                // Add the "message"
                var $social = $('.social-icons');
                var fb = $social.attr('data-facebook');
                var twitter = $social.attr('data-twitter');
                var msg = $this.attr('data-success-msg') || "We&rsquo;ll be in touch periodically with the latest X-Plane news.";
                $this.after(
                    '<p>' + msg + '</p>' +
                    '<p>Until then, you might want to follow us on <a title="Follow X-Plane on Facebook" href="' + fb + '" target="_blank">Facebook</a>&nbsp;or&nbsp;<a title="Follow X-Plane on Twitter" href="' + twitter + '" target="_blank">Twitter</a>.</p>'
                );

                // Change or add the title, as necessary
                var $title = $parent.find('.email-block-title');
                var titleContent = $this.attr('data-success-title') || "You&rsquo;re now signed up!";
                if($title.length) {
                    $title.html(titleContent);
                } else {
                    $this.after('<h2 class="email-block-title">' + titleContent + '</h2>');
                }

                // Redirect, as necessary
                if($this.attr('data-redirect')) {
                    setTimeout(function() {
                        // Tyler says: C.io seems to get "empty" users (nothing but an ID) if we redirect immediately
                        // But their API doesn't provide a way to know when they're done, so... I guess we just wait a couple seconds
                        window.location = $this.attr('data-redirect');
                    }, 3000);
                }
            }
        } else {
            error("Sorry, that doesn&rsquo;t look like an email address&hellip;", $this);
        }
        ev.preventDefault();
        return false;
    })
});