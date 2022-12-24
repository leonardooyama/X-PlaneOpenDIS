function screenIsSmall() {
    return jQuery("#medium-less-than-full-width").outerWidth() == jQuery(window).width();
}
function screenIsMedium() {
    return jQuery("#medium-less-than-full-width").outerWidth() < jQuery(window).width();
}
function screenIsLarge() {
    return jQuery("#large-less-than-full-width").outerWidth() < jQuery(window).width();
}

function stringEndsWithAnyOf(s, endings) {
    for(var i = 0; i < endings.length; ++i) {
        if(s.indexOf(endings[i]) === (s.length - endings[i].length)) {
            return true;
        }
    }
    return false;
}

function scripts() {
    var searchFormLockedVisible = false;
    function showSearchForm() {
        jQuery('.site-header .search-form').addClass('search-form-expanded');
        jQuery(".search-form input[name='s']").focus();
    }
    function hideSearchForm() {
        if(!searchFormLockedVisible) {
            jQuery('.site-header .search-form').removeClass('search-form-expanded');
        }
    }
    function validateSearchInput(ev) {
        if(jQuery(".search-form input[name='s']").val().length == 0) {
            searchFormLockedVisible = true;
            showSearchForm();
            ev.preventDefault();
            return false;
        } else {
            return true;
        }
    }

    var $ = jQuery.noConflict();

    var REM_TO_PX = parseFloat($("html").css("font-size")); // width in px of 1 rem
    var isSmall = screenIsSmall();
    var isMedium = screenIsMedium();
    var isLarge = screenIsLarge();

    if(isLarge) {
        console.log("Large");
    } else if(isMedium) {
        console.log("Medium");
    } else if(isSmall) {
        console.log("Small");
    }

    $('.browse-nav').each(function() {
        var $ul = $(this).children("ul").first();
        $ul.width('auto');
        if(isLarge) {
            var $lis = $ul.find("li");
            var sum = 0;
            $lis.each(function(){ sum += Math.ceil($(this).outerWidth()); });
            $ul.width(sum + 100);
        }
    });

    $('.before-dropdown').show();
    $('.after-dropdown').hide();
    $('img').attr('width', '').attr('height', '');

    var $featuresImg = $('.features-image');
    $featuresImg.height('auto');
    if(isSmall) {
        $('.my_account_orders').addClass('responsive_table');
        $('.responsive_table tbody').wrapInner('<div class="responsive_table_container"></div>');
        $('.responsive_table_container').width(function () {
            return ($(this).find('tr').length * 240) + 100 + 240;
        });
        $featuresImg.height(20 * REM_TO_PX);

        $('body').removeClass('has-video-hero');
        $('.video-hero-container').hide();

    } else { // medium or larger
        $('.responsive_table_container').contents().unwrap();
        $('.my_account_orders').removeClass('responsive_table');
        $featuresImg.height($featuresImg.closest('.row').height());
    }

    if(isLarge) {
        var $searchBtn = $('#search-button');
        $searchBtn.hover(showSearchForm);
        $("#search-form").submit(validateSearchInput);
        $('.page-wrap').hover(hideSearchForm);
        $searchBtn.unbind('click').bind('click', function(ev) {
            if(validateSearchInput(ev)) {
                $('.site-header .search-form').submit();
            }
        });
        var $sidebar = $(".sidebar");
        if($sidebar.length) {
            var $window = $(window);
            var offset = $sidebar.offset();
            var topPadding = 30;
            $window.scroll(function() {
                if($window.scrollTop() < $('.main-section').outerHeight() - $('.woocommerce #secondary').height() / 2) {
                    if($window.scrollTop() > offset.top) {
                        var maxTopMargin = $sidebar.closest(".main-section").height() - $sidebar.outerHeight();
                        $sidebar.stop().animate({marginTop: Math.min($window.scrollTop() - offset.top + topPadding, maxTopMargin)});
                    } else {
                        $sidebar.stop().animate({marginTop: 0});
                    }
                }
            });
        }
    } else {  // medium or smaller
        $(window).unbind('scroll');
        $(".sidebar").css('margin-top', 0);
        $('.mobile-nav-icon').focus(function () {
            var theicon = $(this).find('img');
            var iconurl = theicon.attr('src').replace('.svg', '');
            var iconurl = iconurl.replace('-white', '');
            var addwhite = iconurl + '-white.svg';
            theicon.attr('src', addwhite);
        }).blur(function () {
            theicon = $(this).find('img');
            removewhite = theicon.attr('src').replace('-white', '');
            theicon.attr('src', removewhite);
        });
        $('.mobile-nav-icon:not(#menu-button)').unbind('click').bind('click', function () {
        });
        $('#menu-button').unbind('click').bind('click', function () {
            $('.open-menu').removeClass('open-menu');
            $('#site-nav-menu').toggleClass('open-menu');
            $('body').removeClass('open-menu-body');
            return false;
        });
        $('#search-button').unbind('click').bind('click', function () {
            $('.open-menu:not(.site-header .search-form)').removeClass('open-menu');
            $('.site-header .search-form').addClass('open-menu');
            $('body').addClass('open-menu-body');
            $('.search-button').show();
            return false;
        });
        $('#account-nav-button').unbind('click').bind('click', function () {
            $('body').addClass('open-menu-body');
            $('.open-menu:not(#account-nav-menu)').removeClass('open-menu');
            $('#account-nav-menu').addClass('open-menu');
            return false;
        });
        $('.page-wrap').unbind('click').bind('click', function () {
            $('.open-menu').removeClass('open-menu');
            $('body').removeClass('open-menu-body');
        });
        $('.search-button').hide();
    }

    /*function showTransition(e) {
        if (e.metaKey == false) {
            $('header,footer,.page-wrap').css('opacity', '.5');
            $('body').height($(window).height());
            $('.cs-loader').fadeIn();
        }
    }
    $('a:not([href*="#"]):not(.add_to_cart_button):not(.video-thumbnail a):not(.gallery-icon a):not(.remove)').on('click', function (e) {
        if(e.which == 1) { // left mouse btn pressed
            showTransition(e);
        }
    });
    $('form:not(.wpcf7-form)').on('submit', showTransition);
    */
    $('a[href="#top"]').unbind('click').bind('click', function () {
        $('html, body').animate({
            scrollTop: 0
        }, 300);
        return false;
    });

    // Enable the Magnific lightbox
    var magnificImgSettings = {
        type: 'image',
        closeOnContentClick: true,
        gallery: { enabled: true },
        zoom: {
            enabled: true,
            duration: 300
        }
    };
    $('.gallery a:not(.gallery-ignore)').magnificPopup(magnificImgSettings);
    $('.magnific-link').magnificPopup(magnificImgSettings);
    $('a > img').each(function(idx, el) {
        var $parent = $(el).parent();
        var href = $parent.attr('href');
        console.log("Considering magnific popup on " + href);
        if(stringEndsWithAnyOf(href.toLowerCase(), ['.png', '.gif', '.jpg', '.jpeg'])) {
            $parent.magnificPopup(magnificImgSettings);
        }
    });
    $('.video-thumbnail a, a.video-modal-link').magnificPopup({type: 'iframe'});

    // Set the hero height to show the full background video (if a video is in use)
    var hero = $('.has-video-hero .hero');
    if(hero.length) {
        var requiredHeight = $('.video-hero-container > *').outerHeight() - $('.site-header').outerHeight();
        hero.css('minHeight', requiredHeight);
    }

    // Fix the "all" option for the Knowledge Base search form
    $(".taxonomies-filter-widget-form li .taxlabel").each(function(idx){
        var $this = $(this);
        var correspondingSelectOptions = $this.next("select").children();
        if(correspondingSelectOptions.length) {
            $(correspondingSelectOptions[0]).text("All " + $this.text());
        }
    });
}
jQuery(function () {
    function oneTimeOnly() {
        var $ = jQuery.noConflict();
        var hr = '<hr class="auto">';
        $('.single article h2:not(:first-child)').before(hr);
        $('.single-aircraft article h3, .single-tutorial article h3, .single-challenge article h3').before(hr);
        if(!screenIsLarge()) {
            $('#secondary').before(hr);
        }
        if($('.slider').length)
            $('.slider').sliderify();
        if($('.browse').length)
            $('.browse').browserify();

        $('body.woocommerce .site-nav a').each(function() {
            var $this = $(this);
            if($.trim($this.text()) == "Buy It") {
                $this.closest("li").addClass("current-menu-ancestor");
            }
        });

        $('.dropdown-toggle').on('click', function () {
            $(this).toggleClass('open-dropdown');
            var theparent = $(this).parent();
            theparent.find('.before-dropdown').toggle();
            theparent.find('.after-dropdown').toggle();
        });
        $('.page-links').html(function () {
            return $(this).html().replace('Pages: ', '');
        });
        $('#order_review_heading').prependTo('#order_review');

        // Smooth scrolling: when you click an anchor link elsewhere on the page, scroll to it smoothly
        /*
        $('a[href*="#"]:not([href="#"]):not([href="#site-nav-menu"]):not([href="#search-form"])').click(function(ev) {
            if(location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
                var target = $(this.hash);
                target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
                if(target.length) {
                    $('html, body').animate({
                        scrollTop: target.offset().top
                    }, 1000);
                    ev.preventDefault();
                    return false;
                }
            }
        });*/

        // Require GDPR consent to post a comment
        $('#commentform').submit(function(event) {
            var checkboxes = $(this).find('#wpgdprc');
            if(checkboxes.length && !checkboxes[0].checked) {
                alert('We cannot accept your comment unless you consent for your personal data to be stored in accordance with our privacy policy.');
                event.preventDefault();
                return false;
            }
        });
    }

    oneTimeOnly();
    scripts();
    jQuery(window).resize(scripts);
});

// Paths that ThickBox requires
if(typeof tb_pathToImage != 'string')
    var tb_pathToImage = "/wp-includes/js/thickbox/loadingAnimation.gif";
if(typeof tb_closeImage != 'string')
    var tb_closeImage = "/wp-includes/js/thickbox/tb-close.png";
