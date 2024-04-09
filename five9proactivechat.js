function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// Make it safe to do console.log() always.
(function (con) {
  var method;

  var dummy = function dummy() {};

  var methods = ('assert,count,debug,dir,dirxml,error,exception,group,' + 'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' + 'time,timeEnd,trace,warn').split(','); // eslint-disable-next-line no-cond-assign

  while (method = methods.pop()) {
    con[method] = con[method] || dummy;
  }
})(window.console = window.console || {});

var Five9Modules = Five9Modules || {};
var Five9ProactiveChat = {};
var Five9SocialWidget;

(function () {
  var offers;
  var key;
  var sessiondata;
  var sessionReportHistory;
  var timers;
  var sessionId;
  var tenant;
  var five9url;
  var five9chaturl;
  var title;
  var showProfiles;
  var currentoffer;
  var pages2add;
  var customChatFields;
  var passthroughChatOptions;
  var processingOffer;
  var notificationType;
  var offerCallback;
  var SharedProactive;
  var WindowName = 'Five9ChatWindow';

  navigator.sayswho = function () {
    var ua = navigator.userAgent,
        tem,
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      return 'IE ' + (tem[1] || '');
    }

    if (M[1] === 'Chrome') {
      tem = ua.match(/\bOPR\/(\d+)/);
      if (tem != null) return 'Opera ' + tem[1];
    }

    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
  }(); // Object.assign polyfill for IE11 from MDN, re-formatted to pass Sonar


  if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function value(target, varArgs) {
        if (target == null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        var copyProps = function copyProps(source) {
          var _copy = function _copy() {
            for (var key in source) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                to[key] = source[key];
              }
            }
          };

          if (source != null) {
            _copy();
          }
        };

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];
          copyProps(nextSource);
        }

        return to;
      },
      writable: true,
      configurable: true
    });
  }

  function arrayUnique(array) {
    var a = array.concat();

    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j]) a.splice(j--, 1);
      }
    }

    return a;
  }

  function sendFreedomRequest(async, type, url, dataType, data, onSuccess, onError) {
    console.log('sendFreedomRequest', type, url, data);
    var xhr = new XMLHttpRequest();
    xhr.open(type, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = dataType;

    xhr.onload = function (ev) {
      var request = ev.target;

      if (request.response && request.response.five9ExceptionDetail) {
        onError && onError({
          status: request.response.five9ExceptionDetail.errorCode,
          message: request.response.five9ExceptionDetail.message
        });
      } else {
        onSuccess && onSuccess(request.response);
      }
    };

    xhr.onerror = function (ev) {
      var request = ev.target;
      var error = {
        status: request.response.five9ExceptionDetail ? request.response.five9ExceptionDetail.errorCode : request.status,
        message: request.response.five9ExceptionDetail ? request.response.five9ExceptionDetail.message : request.responseText
      };
      onError && onError(error);
    };

    var payload = data ? JSON.stringify(data) : null;
    xhr.send(payload);
  }

  function serverToChatOffer(record) {
    var offer = {};
    offer.name = record.name;
    offer.profileId = record.id;
    offer.tenantId = record.tenantId;
    offer.groupId = record.groupId;
    offer.profile = record.name;
    offer.description = record.name;
    offer.enablePreviewChat = record.enablePreviewChat;
    offer.proactiveChatQuestion = record.proactiveChatQuestion;
    offer.proactiveChatOfferTimeout = record.proactiveChatOfferTimeout;
    offer.numberOfOfferPerSession = record.proactiveChatNumberOfOffer;
    offer.previewContactEditAllowed = record.previewContactEditAllowed;
    offer.maxWaitTime = record.proactiveEstimatedWaitTime;
    offer.condition = {};
    offer.condition.type = record.chatOfferCondition;
    offer.offerNumber = 0;

    switch (offer.condition.type) {
      case 'Number_of_visited_web_pages':
        offer.condition.consecutive = record.consecutivePagesOnly === 1;
        offer.condition.number = record.proactiveChatNumberOfPages;
        break;

      case 'Amount_of_time_spent':
        offer.condition.consecutive = record.consecutivePagesOnly === 1;
        offer.condition.time = record.proactiveChatTimeSpent;
        break;

      case 'Mouse_hover_time_interval':
        offer.condition.duration = record.proactiveChatHoverDuration;
        break;

      default:
        break;
    }

    return offer;
  }

  function readChatOffers() {
    try {
      if (typeof Storage !== 'undefined') {
        var json = sessionStorage.getItem('f9-proactive-chat-offers');

        if (json) {
          return JSON.parse(json);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function writeChatOffers() {
    var json = JSON.stringify(offers);
    sessionStorage.setItem('f9-proactive-chat-offers', json);
  }

  function readSessionId() {
    return sessionStorage.getItem('f9-proactive-session-id');
  }

  function writeSessionId(session_id) {
    sessionStorage.setItem('f9-proactive-session-id', session_id);
  }

  function readSessionData() {
    try {
      if (typeof Storage !== 'undefined') {
        var json = sessionStorage.five9_proactive_chat_sessiondata;
        if (json) sessiondata = JSON.parse(json);
        console.log('FIVE9 ==> Read Session Data', sessiondata);
      } else {
        console.log('FIVE9 ==> No Web Storage support.. we may use cookies');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function writeSessionData() {
    try {
      if (typeof Storage !== 'undefined') {
        console.log('FIVE9 ==> Save Session Data:', sessiondata);
        var json = JSON.stringify(sessiondata);
        sessionStorage.five9_proactive_chat_sessiondata = json;
      } else {
        console.log('FIVE9 ==> No Web Storage support.. we may use cookies');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function readReportHistory() {
    sessionReportHistory = {
      currentpage: null,
      history: []
    };

    try {
      if (typeof Storage !== 'undefined') {
        var json = sessionStorage.getItem('f9-proactive-report');

        if (json) {
          json = JSON.parse(json);
          sessionReportHistory.history = json.history;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function writeReportHistory(session_id) {
    try {
      if (typeof Storage !== 'undefined') {
        var json = {
          history: sessionReportHistory.history
        };
        sessionStorage.setItem('f9-proactive-report', JSON.stringify(json));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function pushReportHistory(pageid) {
    if (sessionReportHistory) {
      var page = {};
      page.pageid = pageid;
      page.url = window.location.href;

      if (sessionReportHistory.currentpage) {
        // exit page | chat offer
        var exitdate = new Date();
        var duration = exitdate.getTime() - new Date(sessionReportHistory.currentpage.enterdate).getTime();
        page.enterdate = sessionReportHistory.currentpage.enterdate;
        page.exitdate = exitdate;
        page.duration = duration;
        sessionReportHistory.currentpage.enterdate = exitdate;
        sessionReportHistory.currentpage.exitdate = exitdate;
        sessionReportHistory.currentpage.duration = 0;
      } else {
        // enter page
        var now = new Date();
        sessionReportHistory.currentpage = {};
        sessionReportHistory.currentpage.pageid = pageid;
        sessionReportHistory.currentpage.enterdate = now;
        sessionReportHistory.currentpage.exitdate = now;
        sessionReportHistory.currentpage.duration = 0;
        page.enterdate = now;
        page.exitdate = now;
        page.duration = 0;
      }

      console.debug('Five9 ==> Report History', JSON.stringify(page, 0, 2));
      sessionReportHistory.history.push(page);
      writeReportHistory();
    }
  }

  function sortByLastDate(a, b) {
    a = a.lastdate;
    b = b.lastdate;

    if (a > b) {
      return -1;
    } else if (a < b) {
      return 1;
    }

    return 0;
  }

  function collateHistory(profile) {
    var sessionHistory = sessionReportHistory.history;
    var historyDictionary = {};

    for (var i = 0; i < sessionHistory.length; i++) {
      var sessionHistoryItem = sessionHistory[i];
      var enterdate = sessionHistoryItem.enterdate;

      if (typeof enterdate !== 'string') {
        enterdate = enterdate.toISOString();
      }

      var exitdate = sessionHistoryItem.exitdate;

      if (typeof exitdate !== 'string') {
        exitdate = exitdate.toISOString();
      }

      if (historyDictionary[sessionHistoryItem.pageid]) {
        historyDictionary[sessionHistoryItem.pageid].duration += sessionHistoryItem.duration;

        if (new Date(exitdate).getTime() > new Date(historyDictionary[sessionHistoryItem.pageid].exitdate).getTime()) {
          // use newest exitdate
          historyDictionary[sessionHistoryItem.pageid].exitdate = exitdate;
        }

        if (new Date(enterdate).getTime() < new Date(historyDictionary[sessionHistoryItem.pageid].enterdate).getTime()) {
          // use oldest enterdate
          historyDictionary[sessionHistoryItem.pageid].enterdate = enterdate;
        }
      } else {
        historyDictionary[sessionHistoryItem.pageid] = {
          pageid: sessionHistoryItem.pageid,
          enterdate: enterdate,
          exitdate: exitdate,
          duration: sessionHistoryItem.duration,
          url: sessionHistoryItem.url
        };
      }
    }

    var history = [];

    for (var key in historyDictionary) {
      if (historyDictionary.hasOwnProperty(key)) {
        history.push(historyDictionary[key]);
      }
    }

    history = history.sort(sortByLastDate);
    var currentPageId = sessiondata.currentpage ? sessiondata.currentpage.pageid : '';
    return {
      profile: profile,
      currentPage: currentPageId,
      history: history
    };
  }

  function onAccept(chatOptions) {
    chatOptions.offerNumber = currentoffer.offerNumber;

    if (chatOptions && customChatFields) {
      chatOptions.fields = customChatFields;
    }

    if (chatOptions && passthroughChatOptions) {
      Object.assign(chatOptions, passthroughChatOptions);
    }

    try {
      if (Five9SocialWidget && Five9SocialWidget.widgetAdded) {
        var query = Object.assign({}, chatOptions, {
          tenant: tenant,
          profiles: currentoffer.profile,
          tokenId: chatOptions.tokenId,
          farmId: chatOptions.farmId,
          title: title,
          showProfiles: showProfiles,
          analytics: chatOptions.analytics
        });
        Five9SocialWidget.maximizeChat(query);
      } else {
        console.log('Five9ProactiveChat onAccept');
        Five9ProactiveChat.openChatWindow(chatOptions);
      }
    } catch (e) {
      console.error('FIVE9 ==> Five9ProactiveChat. onAccept() exception:', e);
    }
  }

  function onReject() {
    console.log('Five9ProactiveChat onReject()');
    Five9ProactiveChat.savePageHistory();
  }

  Five9ProactiveChat.init = function (options, callback) {
    key = options.token;
    tenant = options.tenant;
    title = options.title;
    showProfiles = options.showProfiles;
    five9url = options.restAPI;
    five9chaturl = options.chatConsole;
    notificationType = options.notificationType;
    offerCallback = callback;
    customChatFields = false;
    passthroughChatOptions = false;

    if (options.customChatFields) {
      customChatFields = options.customChatFields;
    }

    if (options.chatOptions) {
      passthroughChatOptions = options.chatOptions;
    }

    offers = null;
    sessiondata = null;
    timers = [];
    pages2add = [];
    processingOffer = false;
    SharedProactive = Five9Modules.SharedProactive;

    if (!SharedProactive.supportsFeatures()) {
      return false;
    }

    console.log('FIVE9 ==> Proactive Chat Script Loaded... key[%s] browser[%s]', key, navigator.sayswho, navigator);
    window.addEventListener('beforeunload', function (e) {
      if (sessiondata && sessiondata.currentpage) {
        sessiondata.currentpage.exitdate = new Date();
        sessiondata.currentpage.duration = new Date(sessiondata.currentpage.exitdate).getTime() - new Date(sessiondata.currentpage.enterdate).getTime();
        sessiondata.history.push(sessiondata.currentpage);
        sessiondata.pages[sessiondata.currentpage.pageid].totalduration += sessiondata.currentpage.duration;
        sessiondata.consecutivePages[sessiondata.currentpage.pageid].totalduration += sessiondata.currentpage.duration;
        sessiondata.currentpage = null;
        writeSessionData();
      }

      if (sessionReportHistory && sessionReportHistory.currentpage) {
        pushReportHistory(sessionReportHistory.currentpage.pageid);
      }
    });
    var rootUrl = SharedProactive.addTrailingSlash(five9url);
    rootUrl += 'consoles/';
    SharedProactive.initialize({
      restAPI: five9url,
      rootUrl: rootUrl,
      tenant: tenant,
      notificationType: notificationType,
      offerCallback: offerCallback,
      analyticsProvider: 1,
      onAccept: onAccept,
      onReject: onReject
    });
    readSessionData();
    readReportHistory();
    var session_id = readSessionId();

    if (session_id) {
      sessionId = session_id;
      Five9ProactiveChat.readOffers();
    } else {
      sessionId = SharedProactive.generateGuid();
      writeSessionId(sessionId);
      Five9ProactiveChat.readOffers(); // Support Breadcrumbs

      var parameters = {};
      parameters.sessionId = sessionId;
      parameters.appName = 'AppName';
      parameters.appVersion = '1.0.1';
      parameters.deviceType = 'browser';
      parameters.deviceVersion = navigator.sayswho;
      Five9ProactiveChat.breadcrumbsReportAction('Initialize', parameters);
    }
  };

  Five9ProactiveChat.readOffers = function () {
    if (offers) return;

    try {
      var onLoadOffersSuccess = function onLoadOffersSuccess(data) {
        offers = data; // decorate with extra info

        var offerlist = [];

        if (offers.length) {
          offers.forEach(function (record) {
            if (record.groupId > 0) {
              offerlist.push(serverToChatOffer(record));
            }
          });
          offerlist.forEach(function (offer) {
            offer.pages = [];
            offer.fields = [];
            offer.locations = [];
          });
          offers = offerlist;
          writeChatOffers();
          pages2add.forEach(function (page) {
            Five9ProactiveChat.updateOffers(page.pageid, page.offerlist, page.fieldlist, page.locationlist);
          });
        }

        Five9ProactiveChat.checkOffersConditions();
      };

      var json = readChatOffers();

      if (json) {
        console.log('FIVE9 ==> Use Cached Offers');
        offers = json;
      } else {
        console.log('FIVE9 ==> Try to Load Offers');
        SharedProactive.loadOffers(onLoadOffersSuccess);
      }
    } catch (e) {
      console.error(e);
    }
  };

  Five9ProactiveChat.savePageHistory = function () {
    var savePageHistory = function savePageHistory(record, tenantId, profile) {
      try {
        console.log('Five9ProactiveChat.savePageHistory()', record);
        var url = five9url + '/appsvcs/rs/svc/orgs/' + tenantId + '/chatoffers/savehistory/' + tenant;
        var chatWebHistory = {};
        chatWebHistory.sessionId = SharedProactive.generateGuid();
        chatWebHistory.tenantname = tenant;
        chatWebHistory.profile = profile;
        chatWebHistory.history = JSON.stringify(record);
        chatWebHistory.offerNumber = currentoffer.offerNumber;
        chatWebHistory.socialItemId = null;
        console.log('FIVE9 ==> Five9ProactiveChat.savePageHistory() - Saving history:', chatWebHistory);
        sendFreedomRequest(true, 'POST', url, 'json', chatWebHistory, function (data) {
          console.log('FIVE9 ==> Five9ProactiveChat.savePageHistory() save history success:', data);
          record.saved = true;
          writeReportHistory();
          sessionReportHistory.savesCount++;

          if (sessionReportHistory.savesCount >= sessionReportHistory.savesLength) {
            sessionReportHistory.saving = false;
          }
        }, function (error) {
          console.log('FIVE9 ==> Five9ProactiveChat.savePageHistory() save history  error:', error);
          sessionReportHistory.savesCount++;

          if (sessionReportHistory.savesCount >= sessionReportHistory.savesLength) {
            sessionReportHistory.saving = false;
          }
        });
      } catch (e) {
        console.error('FIVE9 ==> Five9ProactiveChat.savePageHistory() save history  exception:', e);
      }
    };

    if (currentoffer && !sessionReportHistory.saving) {
      var saves = [];
      var collatedHistory = collateHistory(currentoffer.profile);

      for (var i = 0; i < collatedHistory.history.length; i++) {
        if (!collatedHistory.history[i].saved) {
          saves.push(collatedHistory.history[i]);
        }
      }

      if (saves.length) {
        sessionReportHistory.saving = true;
        sessionReportHistory.savesCount = 0;
        sessionReportHistory.savesLength = saves.length;
        var tenantId = currentoffer.tenantId;
        var profile = currentoffer.profile;

        for (i = 0; i < saves.length; i++) {
          savePageHistory(saves[i], tenantId, profile);
        }
      }
    }
  };

  Five9ProactiveChat.openChatWindow = function (chatOptions) {
    console.log('Five9ProactiveChat.openChatWindow() for offer : ', currentoffer);
    console.log('window width:' + window.innerWidth);
    console.log('window height:' + window.innerHeight);
    console.log('window X:' + window.screenX);
    console.log('window Y:' + window.screenY);
    var position = {};
    position.top = window.screenY + 100;
    position.left = window.screenX + (window.innerWidth - 400);
    var size = {};
    size.width = 330;
    size.height = 510;
    var query = {
      tenant: tenant,
      profiles: currentoffer.profile,
      tokenId: chatOptions.tokenId,
      farmId: chatOptions.farmId,
      title: title,
      showProfiles: showProfiles,
      analytics: chatOptions.analytics,
      offerNumber: chatOptions.offerNumber
    };

    if (chatOptions && chatOptions.fields && !Array.isArray(chatOptions.fields)) {
      query.fields = JSON.stringify(chatOptions.fields);
    }

    if (chatOptions && chatOptions.preview) {
      query.preview = JSON.stringify(chatOptions.preview);
    }

    if (chatOptions && chatOptions.history) {
      query.history = JSON.stringify(chatOptions.history);
    }

    if (window.dataLayer && typeof window.dataLayer.find === 'function') {
      var googleTagId = window.dataLayer.find(function (layer) {
        if (layer[0] === 'config') {
          return true;
        }

        return false;
      });

      if (googleTagId && googleTagId[1]) {
        query.ga = googleTagId[1];
      }
    }

    if (passthroughChatOptions) {
      Object.assign(query, passthroughChatOptions);
    }

    console.log('Five9ProactiveChat.openChatWindow() query : ', query);
    var url = five9chaturl + '?' + SharedProactive.objectToQuery(query);
    var params = 'location=no, toolbar=no, scrollbars=no, resizable=yes, top=' + position.top + ', left=' + position.left + ', width=' + size.width + ', height=' + size.height;
    console.log('Five9ProactiveChat.openChatWindow() url : ', url);
    var myWindow = window.open(url, WindowName, params);
    console.log(myWindow);
  };

  Five9ProactiveChat.processOfferAccepted = function () {
    SharedProactive.triggerCustomerEngageAccept();
  };

  Five9ProactiveChat.processOfferRefused = function () {
    SharedProactive.triggerCustomerEngageReject();
  };

  Five9ProactiveChat.clearAllTimer = function () {
    // clear all timer
    timers.forEach(function (timer) {
      //console.log('Clearing Timer : ' + timer.name);
      clearTimeout(timer.handle);
    });
    timers = [];
  };

  Five9ProactiveChat.clearTimer = function (name) {
    // clear all timer
    timers.forEach(function (timer) {
      if (name === timer.name) {
        console.log('Clearing Timer : ' + timer.name);
        clearTimeout(timer.handle);
        timers.splice(timer, 1);
      }
    });
  };

  Five9ProactiveChat.currenttime = function () {
    var now = new Date();
    var sDate = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds();
    return sDate;
  };

  Five9ProactiveChat.popupOffer = function (offer) {
    console.log('-->', Five9ProactiveChat.currenttime(), 'popupOffer', offer.name, offer.condition.type);
    Five9ProactiveChat.clearAllTimer();
    if (!sessiondata.currentpage) return;

    if (offer.numberOfOfferPerSession <= 0) {
      console.warn('Maximum offers per session reached');
      sessiondata.currentpage = null;
      sessiondata.pages = {};
      sessiondata.consecutivePages = {};
      sessiondata.history = [];
      writeSessionData();
      return;
    }

    processingOffer = true;
    console.info('numberOfOfferPerSession', offer.numberOfOfferPerSession);
    sessiondata.currentpage.offerdate = new Date();
    sessiondata.currentpage.duration = new Date(sessiondata.currentpage.offerdate).getTime() - new Date(sessiondata.currentpage.enterdate).getTime();
    delete sessiondata.currentpage.exitdate;
    sessiondata.history.push(sessiondata.currentpage);
    currentoffer = offer;
    pushReportHistory(sessiondata.currentpage.pageid);
    var collatedHistory = collateHistory(currentoffer.profile);
    console.info('FIVE9 ==> Collated History', JSON.stringify(collatedHistory, 0, 2));
    sessiondata.currentpage = null;
    sessiondata.pages = {};
    sessiondata.history = [];
    sessiondata.consecutivePages = {};
    writeSessionData();
    Five9ProactiveChat.requestPermission2PopupOffer(function (status) {
      processingOffer = false;
      writeSessionData();

      if (status === 'yes') {
        offer.numberOfOfferPerSession--;
        offer.offerNumber++;
        writeChatOffers();
        var offerOptions = {
          question: offer.question,
          timeout: offer.poptimeout,
          profile: offer,
          history: collatedHistory
        };
        SharedProactive.triggerOffer(offerOptions);
      }
    });
  };

  Five9ProactiveChat.requestPermission2PopupOffer = function (callback) {
    try {
      console.log('FIVE9 ==> Five9ProactiveChat.requestPermission2PopupOffer() request permission to present offer[%s]', currentoffer.name, currentoffer);
      var payload = {
        tenantName: tenant,
        five9SessionId: null
      };
      var url = five9url + '/appsvcs/rs/svc/orgs/estimatedwaittime/1000?tenantName=' + encodeURIComponent(tenant) + '&campaignName=' + currentoffer.name;
      sendFreedomRequest(true, 'GET', url, 'json', null, function (data) {
        data = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('FIVE9 ==> Five9ProactiveChat.requestPermission2PopupOffer() success:', data);

        if (data.resultCode === 0) {
          if (!data.businessHours.openForBusiness) {
            console.log('Profile is closed for business', currentoffer.name);
            return callback('no');
          }

          var estimatedWaitMinutes = Math.round(data.ewt / 60);
          console.log('Estimated wait time is : [%d] minutes', estimatedWaitMinutes);

          if (estimatedWaitMinutes <= currentoffer.maxWaitTime) {
            callback('yes');
          } else {
            console.log('Estimated wait time too long');
            callback('no');
          }
        } else {
          console.warn('No agents are logged in');
          callback('no');
        }
      }, function (error) {
        console.log('FIVE9 ==> Five9ProactiveChat.requestPermission2PopupOffer() error:', error);
        callback('no');
      });
    } catch (e) {
      console.error('FIVE9 ==> Five9ProactiveChat.requestPermission2PopupOffer() exception:', e);
      callback('no');
    }
  };

  Five9ProactiveChat.checkOffersConditions = function () {
    console.log('FIVE9 ==> Check Offers Conditions');
    Five9ProactiveChat.clearAllTimer();
    if (!offers || processingOffer) return;
    offers.forEach(function (offer) {
      if (offer.numberOfOfferPerSession <= 0) {
        console.info('Maximum offer per session reached');
      }

      if (offer.numberOfOfferPerSession > 0 && sessiondata.currentpage) {
        console.log('FIVE9 ==> checkOffersConditions - start', offer.name, offer.condition.type, sessiondata.currentpage.pageid);

        switch (offer.condition.type) {
          case 'Number_of_visited_web_pages':
            var numberofpages = 0;

            if (offer.condition.consecutive) {
              var numberofpagevisited = sessiondata.history.length;
              var visitedpagesmap = {};

              while (numberofpagevisited > 0 && offer.pages.indexOf(sessiondata.history[numberofpagevisited - 1].pageid) > -1) {
                visitedpagesmap[sessiondata.history[numberofpagevisited - 1].pageid] = sessiondata.history[numberofpagevisited - 1];
                numberofpagevisited--;
              }

              offer.pages.forEach(function (page) {
                if (visitedpagesmap[page]) numberofpages++;
              });
              if (offer.pages.indexOf(sessiondata.currentpage.pageid) > -1 && !visitedpagesmap[sessiondata.currentpage.pageid]) numberofpages++;
            } else {
              offer.pages.forEach(function (page) {
                if (sessiondata.pages[page]) numberofpages++;
              });
              if (offer.pages.indexOf(sessiondata.currentpage.pageid) > -1 && !sessiondata.pages[sessiondata.currentpage.pageid]) numberofpages++;
            }

            if (numberofpages >= offer.condition.number) {
              Five9ProactiveChat.popupOffer(offer);
            }

            break;

          case 'Amount_of_time_spent':
            if (offer.pages.indexOf(sessiondata.currentpage.pageid) > -1) {
              var currentTimeSpent = new Date().getTime() - new Date(sessiondata.currentpage.enterdate).getTime();
              console.log('----: currentTimeSpent - start: ' + currentTimeSpent);

              if (offer.condition.consecutive) {
                numberofpagevisited = sessiondata.history.length;
                var visitedpages = [];
                console.log('----: check consecutive pages - numberofpagevisited ' + numberofpagevisited);

                while (numberofpagevisited > 0 && offer.pages.indexOf(sessiondata.history[numberofpagevisited - 1].pageid) > -1) {
                  visitedpages.push(sessiondata.history[numberofpagevisited - 1]);
                  numberofpagevisited--;
                }

                console.log('----: check consecutive pages - visitedpages length ' + visitedpages.length);
                visitedpages.forEach(function (visitedpage) {
                  currentTimeSpent += visitedpage.duration;
                });
              } else {
                offer.pages.forEach(function (page) {
                  if (sessiondata.pages[page]) {
                    currentTimeSpent += sessiondata.pages[page].totalduration;
                  }
                });
              }

              console.log('----: currentTimeSpent - end: ' + currentTimeSpent);
              var timeout = offer.condition.time * 1000 - currentTimeSpent;
              console.log('FIVE9 ==> Offer[%s] timeout after[%d] seconds', offer.name, timeout);

              if (timeout > 0) {
                timers.push({
                  name: sessiondata.currentpage.pageid,
                  handle: setTimeout(function () {
                    Five9ProactiveChat.popupOffer(offer);
                  }, timeout)
                });
              } else {
                Five9ProactiveChat.popupOffer(offer);
              }
            }

            break;

          case 'Mouse_hover_time_interval':
            if (offer.pages.indexOf(sessiondata.currentpage.pageid) > -1) {
              offer.fields.forEach(function (field) {
                var hover = {};
                var element = document.getElementById(field);
                element.addEventListener('mouseenter', function (e) {
                  if (sessiondata.currentpage) {
                    hover = {
                      type: 'field',
                      id: field,
                      entertime: new Date()
                    };
                    timers.push({
                      name: 'hover_on_field_' + offer.name + '_' + sessiondata.currentpage.pageid + '_' + field,
                      handle: setTimeout(function () {
                        hover.offertime = new Date();
                        hover.duration = new Date(hover.offertime).getTime() - new Date(hover.entertime).getTime();
                        if (!sessiondata.currentpage.hovers) sessiondata.currentpage.hovers = [];
                        Five9ProactiveChat.popupOffer(offer);
                      }, offer.condition.duration * 1000)
                    });
                  }
                });
                element.addEventListener('mouseleave', function (e) {
                  if (sessiondata.currentpage) {
                    hover.exittime = new Date();
                    hover.duration = new Date(hover.exittime).getTime() - new Date(hover.entertime).getTime();
                    if (!sessiondata.currentpage.hovers) sessiondata.currentpage.hovers = [];
                    Five9ProactiveChat.clearTimer('hover_on_field_' + offer.name + '_' + sessiondata.currentpage.pageid + '_' + field);
                  }
                });
              });
            }

            break;

          default:
            break;
        }
      }
    });
  };

  Five9ProactiveChat.updateOffers = function (pageid, offerlist, fieldlist, locationlist) {
    var saveoffers2session = false;

    if (offers) {
      console.log('FIVE9 ==> updateOffers() adding page[%s] to offers', pageid);
      var parameters = {};
      parameters.sessionId = sessionId;
      parameters.name = pageid;
      parameters.offer = pageid;
      Five9ProactiveChat.breadcrumbsReportAction('EnterScreen', parameters);
      offers.forEach(function (offer) {
        if (offerlist.indexOf(offer.name) > -1) {
          if (offer.pages.indexOf(pageid) === -1) {
            saveoffers2session = true;
            offer.pages.push(pageid);
            offer.fields = arrayUnique(offer.fields.concat(fieldlist));
            offer.locations = arrayUnique(offer.locations.concat(locationlist));
          }
        }
      });
    } else {
      console.log('FIVE9 ==> updateOffers() saving page[%s] to add to offers once loaded', pageid);

      if (!pages2add) {
        pages2add = [];
      }

      pages2add.push({
        pageid: pageid,
        offerlist: offerlist,
        fieldlist: fieldlist,
        locationlist: locationlist
      });
    }

    if (saveoffers2session) {
      writeChatOffers();
    }
  };

  Five9ProactiveChat.startNewPage = function (params) {
    var pageid = params.pageId;
    var offerlist = params.profiles;
    var fieldlist = params.fields;
    console.log('FIVE9 ==> Enter page[%s]', pageid, offerlist, fieldlist);

    if (!SharedProactive.supportsFeatures()) {
      return false;
    }

    Five9ProactiveChat.updateOffers(pageid, offerlist, fieldlist, []);

    if (!sessiondata) {
      sessiondata = {};
      sessiondata.currentpage = null;
      sessiondata.pages = {};
      sessiondata.consecutivePages = {};
      sessiondata.history = [];
      sessiondata.previousPage = null;
    } // build consecutive pages


    if (sessiondata.previousPage) {
      if (sessiondata.previousPage.url !== document.referrer) {
        sessiondata.consecutivePages = {};
      }
    } else {
      sessiondata.consecutivePages = {};
    }

    sessiondata.previousPage = {};
    sessiondata.previousPage.url = window.location.href;
    sessiondata.previousPage.pageid = pageid;

    if (sessiondata.currentpage) {
      sessiondata.currentpage.exitdate = new Date();
      sessiondata.currentpage.duration = new Date(sessiondata.currentpage.exitdate).getTime() - new Date(sessiondata.currentpage.enterdate).getTime();
      sessiondata.history.push(sessiondata.currentpage);
      sessiondata.pages[sessiondata.currentpage.pageid].totalduration += sessiondata.currentpage.duration;
      sessiondata.consecutivePages[sessiondata.currentpage.pageid].totalduration += sessiondata.currentpage.duration;
    }

    sessiondata.currentpage = {};
    sessiondata.currentpage.pageid = pageid;
    sessiondata.currentpage.enterdate = new Date();
    sessiondata.currentpage.exitdate = new Date();
    sessiondata.currentpage.duration = 0;

    if (!sessiondata.pages[pageid]) {
      sessiondata.pages[pageid] = {};
      sessiondata.pages[pageid].totalduration = 0;
      sessiondata.pages[pageid].numberofvisit = 0;
    }

    sessiondata.pages[pageid].numberofvisit++;

    if (!sessiondata.consecutivePages[pageid]) {
      sessiondata.consecutivePages[pageid] = {};
      sessiondata.consecutivePages[pageid].totalduration = 0;
      sessiondata.consecutivePages[pageid].numberofvisit = 0;
    }

    sessiondata.consecutivePages[pageid].numberofvisit++;
    writeSessionData();
    pushReportHistory(pageid);
    Five9ProactiveChat.checkOffersConditions();
  };

  Five9ProactiveChat.breadcrumbsTerminate = function (reason, description) {
    var parameters = {};
    parameters.sessionId = sessionId;
    parameters.reason = reason;
    parameters.reasonData = description;
    Five9ProactiveChat.breadcrumbsReportAction('Terminate', parameters);
  };

  Five9ProactiveChat.breadcrumbsPageError = function (pageid, error) {
    var parameters = {};
    parameters.sessionId = sessionId;
    parameters.name = pageid;
    parameters.error = error;
    Five9ProactiveChat.breadcrumbsReportAction('ScreenError', parameters);
  };

  Five9ProactiveChat.breadcrumbsLoyaltyAction = function (actionname) {
    var parameters = {};
    parameters.sessionId = sessionId;
    parameters.name = actionname;
    Five9ProactiveChat.breadcrumbsReportAction('LoyaltyAction', parameters);
  };

  Five9ProactiveChat.breadcrumbsReportAction = function (action, parameters) {
    console.log('Report Breadcrumbs Action not supported in this version.');
    return;
  };
})();

(function () {
  var ProactivePersist = {
    Version: 1,
    Key: 'f9-offers',
    loadData: function loadData() {
      try {
        var data = sessionStorage.getItem(ProactivePersist.Key);

        if (data) {
          try {
            data = JSON.parse(data);
          } // eslint-disable-next-line no-empty
          catch (err) {}

          if (data.version === ProactivePersist.Version) {
            console.info('Persist:loadData()', ProactivePersist.Key, data);
            delete data.version;
            delete data.date;
            return data;
          }
        }
      } // eslint-disable-next-line no-empty
      catch (err) {}

      return undefined;
    },
    saveData: function saveData(data) {
      try {
        data.date = Date.now();
        data.version = ProactivePersist.Version;
        sessionStorage.setItem(ProactivePersist.Key, JSON.stringify(data));
        console.info('Persist:saveData()', ProactivePersist.Key, data);
      } // eslint-disable-next-line no-empty
      catch (err) {}
    }
  };

  if (Five9Modules) {
    Five9Modules.ProactivePersist = ProactivePersist;
  }
})();
/* global Five9SocialWidget, f9CustomPreviewOfferTemplate, f9CustomProactiveOfferTemplate */
// SharedProactive is shared with proactive chat and social widget
// it has no dependencies.  DO NOT USE JQUERY OR ANY OTHER LIBRARIES!


(function () {
  // modules
  var MessageTypes;
  var ProactivePersist;
  var NotificationRootSelector = 'five9-notification';
  var NotificationActiveClass = 'active';
  var ModalRootSelector = 'five9-modal';
  var DefaultHeaderText = 'An agent is ready to chat with you';
  var DefaultPreviewAcceptText = 'Respond';
  var DefaultAcceptText = 'Start Live Chat';
  var TokenId = false;
  var FarmId = false;

  var OnEngageAcceptCallback = function OnEngageAcceptCallback() {};

  var OnEngageRejectCallback = function OnEngageRejectCallback() {};

  var OnOfferCallback = function OnOfferCallback() {};

  var getValueFromFields = function getValueFromFields(searchKey, fields) {
    for (var key in fields) {
      if (key === searchKey) {
        if (fields[key].value && SharedProactive.nonEmptyString(fields[key].value)) {
          return fields[key].value;
        }
      }
    }

    return '';
  };

  var formatTime = function formatTime(d) {
    // simple date format.  moment, etc is too heavy
    var hours = d.getHours();
    hours = hours % 12 > 0 ? hours % 12 : 12;
    var mins = d.getMinutes();
    mins = mins < 10 ? '0' + mins : mins;
    var a = d.getHours() > 12 ? 'pm' : 'am';
    return hours + ':' + mins + ' ' + a;
  };

  var Requests = {
    loadOffers: function loadOffers(options, onSuccess, onError) {
      options = options || {};

      if (typeof options.restAPI !== 'string') {
        throw new Error('loadOffers() Must specify a restAPI');
      }

      if (typeof options.tenant !== 'string') {
        throw new Error('loadOffers() Must specify a tenant');
      }

      options.restAPI = SharedProactive.addTrailingSlash(options.restAPI);
      options.rootUrl = SharedProactive.addTrailingSlash(options.rootUrl);
      var restAPI = options.restAPI + SharedProactive.APIPath;
      var url = restAPI + 'orgs/-1/chatoffers/' + options.tenant;
      var xhrOptions = {
        url: url,
        verb: 'GET'
      };

      if (SharedProactive.Mock) {
        setTimeout(function () {
          onSuccess = onSuccess || function () {};

          onSuccess([{
            "name": "user1_inbound_5555550001",
            "id": 1459464962,
            "tenantId": "421",
            "groupId": "1631",
            "consecutivePagesOnly": 0,
            "chatOfferCondition": "Amount_of_time_spent",
            "proactiveChatQuestion": "Do you need help?",
            "proactiveChatTimeSpent": 10,
            "proactiveChatHoverDuration": 10,
            "proactiveChatNumberOfPages": 1,
            "proactiveChatOfferTimeout": 10,
            "proactiveChatNumberOfOffer": 30,
            "proactiveEstimatedWaitTime": 1,
            "enablePreviewChat": 1,
            //"enablePreviewChat": 0,
            //"previewContactEditAllowed": 1
            "previewContactEditAllowed": 0
          }]);
        }, 1000);
      } else {
        SharedProactive.xhr(xhrOptions, onSuccess, onError);
      }
    },
    status: function status(options, onSuccess, onError) {
      options = options || {};

      if (typeof options.restAPI !== 'string') {
        throw new Error('status() Must specify a restAPI');
      }

      if (options.tenantId === undefined) {
        throw new Error('status() Must specify a tenantId');
      }

      if (options.groupId === undefined) {
        throw new Error('status() Must specify a groupId');
      }

      options.restAPI = SharedProactive.addTrailingSlash(options.restAPI);
      options.rootUrl = SharedProactive.addTrailingSlash(options.rootUrl);
      var restAPI = options.restAPI + SharedProactive.APIPath;
      var url = restAPI + SharedProactive.formatString('orgs/estimatedwaittime/1000?tenantName{0}=&campaignName={1}', encodeURIComponent(options.tenant), options.profiles);
      var xhrOptions = {
        url: url,
        verb: 'GET'
      };

      if (SharedProactive.Mock) {
        setTimeout(function () {
          onSuccess = onSuccess || function () {};

          onSuccess({
            "resultCode": 0,
            "ewt": 7,
            "mediaType": 1000,
            "groupId": 1631,
            "orgId": 421
          });
        }, 1000);
      } else {
        SharedProactive.xhr(xhrOptions, onSuccess, onError);
      }
    },
    openSession: function openSession(options, onSuccess, onError) {
      options = options || {};

      if (typeof options.restAPI !== 'string') {
        throw new Error('openSession() Must specify a restAPI');
      }

      if (typeof options.tenant !== 'string') {
        throw new Error('openSession() Must specify a tenant');
      }

      var restAPI = options.restAPI + SharedProactive.APIPath;
      var url = restAPI + 'auth/anon?cookieless=true&clientApp=proactiveChatConsole';
      var payload = {
        "tenantName": options.tenant,
        "five9SessionId": null
      };
      console.info('openSession', {
        url: url,
        payload: payload
      });
      var xhrOptions = {
        url: url,
        verb: 'POST',
        payload: payload
      };

      if (SharedProactive.Mock) {
        setTimeout(function () {
          onSuccess = onSuccess || function () {};

          onSuccess({
            'tokenId': 'token-1',
            'userId': 'token-1',
            'orgId': 'tenant-1'
          });
        }, 1000);
      } else {
        SharedProactive.xhr(xhrOptions, onSuccess, onError);
      }
    },
    openChatPreview: function openChatPreview(options, onSuccess, onError) {
      options = options || {};

      if (typeof options.restAPI !== 'string') {
        throw new Error('openChatPreview() Must specify a restAPI');
      }

      if (typeof options.sessionId !== 'string') {
        throw new Error('openChatPreview() Must specify a sessionId');
      }

      if (typeof options.profile !== 'string') {
        throw new Error('openChatPreview() Must specify a profile');
      }

      TokenId = options.sessionId;
      FarmId = options.farmId;
      var restAPI = options.restAPI + SharedProactive.APIPath;
      var sessionId = options.sessionId;
      var profile = options.profile;
      var email = getValueFromFields('email', options.fields);

      if (!SharedProactive.nonEmptyString(email)) {
        email = SharedProactive.generateAnonEmail();

        if (options.fields && options.fields.email) {
          options.fields.email.value = email;
        }
      }

      var name = getValueFromFields('name', options.fields);

      if (!SharedProactive.nonEmptyString(name)) {
        name = '';
      }

      var groupId = options.groupId;

      if (!SharedProactive.nonEmptyString(groupId)) {
        groupId = '-1';
      }

      var getBrowserInfo = function getBrowserInfo() {
        return JSON.stringify({
          userAgent: navigator.userAgent,
          language: navigator.language
        });
      };

      var customFields = [];
      customFields.push({
        'key': 'Subject',
        'value': profile,
        'analyze': 0
      });
      customFields.push({
        'key': 'Name',
        'value': name,
        'analyze': 0
      });
      customFields.push({
        'key': 'Email',
        'value': email,
        'analyze': 0
      });
      customFields.push({
        'key': 'Question',
        'value': '',
        'analyze': 1
      });
      customFields.push({
        'key': 'f9-browser',
        'value': getBrowserInfo(),
        'analyze': 0
      });

      if (options.history) {
        console.info('preview chat history', options.history);
        customFields.push({
          'key': 'f9-history',
          'value': JSON.stringify(options.history),
          'analyze': 0
        });
      } else {
        console.info('no history supplied for preview chat');
      }

      if (_typeof(options.customFields) === 'object') {
        customFields = customFields.concat(options.customFields);
      }

      var customVariables = options.customVariables;

      if (_typeof(customVariables) === 'object') {
        for (var id in customVariables) {
          if (customVariables.hasOwnProperty(id)) {
            for (var key in customVariables[id]) {
              if (customVariables[id].hasOwnProperty(key)) {
                customFields.push({
                  'key': id + '.' + key,
                  'value': customVariables[id][key],
                  'analyze': 0
                });
              }
            }
          }
        }
      }

      var getUserTimezone = function getUserTimezone() {
        var timezoneOffset = new Date().getTimezoneOffset();
        var offsetHour = String(Math.abs(timezoneOffset) / 60 * 100).padStart(4, '0');
        var offsetDirection = timezoneOffset >= 0 ? '-' : '+';
        var timezone = 'GMT' + offsetDirection + offsetHour;
        return timezone;
      };

      var chatRequest = {};
      chatRequest.campaign = profile;
      chatRequest.groupId = groupId;
      chatRequest.name = name;
      chatRequest.email = email;
      chatRequest.customFields = customFields;
      chatRequest.analyticsProvider = options.analyticsProvider;
      chatRequest.proactiveChat = true;
      chatRequest.timezone = getUserTimezone();
      var url = restAPI + 'agents/' + sessionId + '/interactions/client_chat_preview';
      console.info('openChatPreview', {
        url: url,
        chatRequest: chatRequest
      });
      var xhrOptions = {
        url: url,
        verb: 'POST',
        payload: chatRequest
      };

      if (SharedProactive.Mock) {
        onSuccess = onSuccess || function () {};

        setTimeout(function () {
          onSuccess({
            loggedInProfileAgent: {
              "profileId": "1631",
              "profileName": "user1_inbound_5555550001",
              "agentLoggedIn": true,
              //"agentLoggedIn": false,
              "noServiceMessage": "We are currently unable to service your request. Please contact us during normal business hours."
            },
            profileSurvey: {
              'profileId': '2504',
              'templateId': 3,
              'templateQuestion': 'Custom survey question',
              'templateThankyouMessage': 'Custom thank you message',
              'enableSurvey': 0
            }
          });
        }, 1000);
      } else {
        SharedProactive.xhr(xhrOptions, onSuccess, onError);
      }
    },
    acceptChatPreviewOffer: function acceptChatPreviewOffer(options, onSuccess, onError) {
      options = options || {};

      if (typeof options.restAPI !== 'string') {
        throw new Error('acceptChatPreviewOffer() Must specify a restAPI');
      }

      if (typeof options.sessionId !== 'string') {
        throw new Error('acceptChatPreviewOffer() Must specify a sessionId');
      }

      var restAPI = options.restAPI + SharedProactive.APIPath;
      var sessionId = options.sessionId;
      var url = restAPI + 'agents/' + sessionId + '/interactions/' + sessionId + '/client_accept_offer';
      var name = getValueFromFields('name', options.fields);
      var email = getValueFromFields('email', options.fields);
      var payload = {
        campaign: options.profile,
        groupId: '-1',
        customFields: [],
        name: name,
        email: email
      };
      console.info('acceptChatPreviewOffer', {
        url: url,
        payload: payload
      });

      if (typeof gtag === 'function') {
        gtag('event', 'Preview Chat Offer Accepted', {
          'event_category': 'Five9',
          'event_label': options.profile
        });
      }

      var xhrOptions = {
        url: url,
        verb: 'PUT',
        payload: payload
      };

      if (SharedProactive.Mock) {
        setTimeout(function () {
          onSuccess = onSuccess || function () {};

          onSuccess({});
        }, 1000);
      } else {
        SharedProactive.xhr(xhrOptions, onSuccess, onError);
      }
    },
    rejectChatPreviewOffer: function rejectChatPreviewOffer(options, onSuccess, onError) {
      options = options || {};

      if (typeof options.restAPI !== 'string') {
        throw new Error('rejectChatPreviewOffer() Must specify a restAPI');
      }

      if (typeof options.sessionId !== 'string') {
        throw new Error('rejectChatPreviewOffer() Must specify a sessionId');
      }

      var restAPI = options.restAPI + SharedProactive.APIPath;
      var sessionId = options.sessionId;
      var url = restAPI + 'agents/' + sessionId + '/interactions/' + sessionId + '/client_reject_offer';
      var payload = {};
      console.info('rejectChatPreviewOffer', {
        url: url,
        payload: payload
      });

      if (typeof gtag === 'function') {
        gtag('event', 'Preview Chat Offer Rejected', {
          'event_category': 'Five9',
          'event_label': options.profile
        });
      }

      var xhrOptions = {
        url: url,
        verb: 'PUT',
        payload: payload
      };

      if (SharedProactive.Mock) {
        setTimeout(function () {
          onSuccess = onSuccess || function () {};

          onSuccess({});
        }, 1000);
      } else {
        SharedProactive.xhr(xhrOptions, onSuccess, onError);
      }
    }
  };

  var engageChatOffer = function engageChatOffer(options) {
    TokenId = options.sessionId;
    FarmId = options.farmId;
    options.onAccept = SharedProactive.triggerCustomerEngageAccept;
    options.onReject = SharedProactive.triggerCustomerEngageReject;

    if (typeof gtag === 'function') {
      var chatType = options.preview === true ? 'Preview' : 'Proactive';
      gtag('event', chatType + ' Chat Offered', {
        'event_category': 'Five9',
        'event_label': options.profile
      });
    }

    if (options.notificationType === 'callback') {
      OnOfferCallback(options.question, options.timeout);
    } else if (options.notificationType === 'modal') {
      SharedProactive.showChatOfferModal(options);
    } else {
      SharedProactive.showChatOfferNotification(options);
    }
  };

  var resume = function resume() {
    var options = SharedProactive.sessionData.options;
    var chatOptions = SharedProactive.sessionData.chatOptions;
    var selectedProfile = SharedProactive.sessionData.selectedProfile;

    var terminateChat = function terminateChat(interactionId) {
      var options = SharedProactive.sessionData.options;

      if (options.sessionId === interactionId) {
        console.warn('interaction terminated', interactionId);
        SharedProactive.closeSocket();
        SharedProactive.sessionData.step = SharedProactive.Steps.LoadOffers;
        SharedProactive.save();
        SharedProactive.hideChatOffer();
      }
    };

    var onSocketEngageRequest = function onSocketEngageRequest(response) {
      console.info('onSocketEngageRequest', response);
      response = response || {};

      if (response.engaged === 1) {
        if (typeof response.question !== 'string') {
          console.error('onSocketEngageRequest() error.  API did not return question');
        }

        options.question = response.question;
        SharedProactive.sessionData.step = SharedProactive.Steps.Engaged;
        SharedProactive.save();
        engageChatOffer(options);
      } else if (response.engaged === 0) {
        if (this.onServerTerminated && typeof this.onServerTerminated === 'function') {
          this.onServerTerminated();
        }

        terminateChat(options.sessionId);
        OnEngageRejectCallback();
      }
    };

    var onSocketInteractionTerminated = function onSocketInteractionTerminated(response) {
      response = response || {};

      if (typeof response.interactionId !== 'string') {
        console.error('onSocketInteractionTerminated() error.  API did not return interactionId');
      }

      terminateChat(response.interactionId);
    };

    var onSocketAgentAccept = function onSocketAgentAccept(response) {
      response = response || {};

      if (typeof response.interaction !== 'string') {
        console.error('onSocketAgentAccept() error.  API did not return interaction');
      }

      SharedProactive.sessionData.messages[0] = response;
      var interaction = JSON.parse(response.interaction);
      var options = SharedProactive.sessionData.options;
      options.ownerId = interaction.ownerId;
      options.displayName = interaction.displayName;
      SharedProactive.save();
    };

    var onSocketReceived = function onSocketReceived(event) {
      if (!event.data) return;

      try {
        var message = JSON.parse(event.data);
        console.log('onSocketReceived', message);
        var payload = message.payLoad;
        var context = message.context;

        if (context && payload) {
          // TODO_API_HACK depending on several factors (sent via AgentConsole or Freedom API), the messageId can arrive on different objects.  force this to be consistent
          payload.messageId = context.messageId;

          if (typeof payload.messageId === 'string' && payload.messageId.length) {
            // TODO_API_HACK sometimes messageId is string, sometimes an int.  force to an int for consistency
            payload.messageId = parseInt(payload.messageId, 10);
          }
        }

        if (payload) {
          if (payload.messageId === MessageTypes.PREVIEW_ENGAGE_ITEM) {
            onSocketEngageRequest(payload);
          } else if (payload.messageId === MessageTypes.INTERACTION_TERMINATE || payload.messageId === MessageTypes.MSG_CHAT_AGENT_TERMINATE) {
            onSocketInteractionTerminated(payload);
          } else if (payload.messageId === MessageTypes.MSG_CHAT_AGENT_ACCEPT) {
            onSocketAgentAccept(payload);
          }
        }
      } catch (err) {
        console.error('Unable to parse socket message', err);
      }
    };

    var onChatPreviewSuccess = function onChatPreviewSuccess(response) {
      console.info('onChatPreviewSuccess', response);

      if (response && response.loggedInProfileAgent && response.loggedInProfileAgent.agentLoggedIn) {
        chatOptions.preview.survey = response.profileSurvey;

        if (!response.profileSurvey || SharedProactive.nonEmptyString(response.profileSurvey.profileId) === false) {
          console.error('profileSurvey does not contain a valid profile id');
        }

        chatOptions.preview.profileId = response.profileSurvey ? response.profileSurvey.profileId : '';
        SharedProactive.sessionData.step = SharedProactive.Steps.WaitForEngage;
        SharedProactive.save();
        console.info('begin listen for engage');
        SharedProactive.openSocket(options, onSocketReceived);
      } else {
        console.warn('No agents are logged in');
      }
    };

    var onSessionSuccess = function onSessionSuccess(response) {
      console.info('onSessionSuccess', response);

      if (SharedProactive.nonEmptyString(response.tokenId) === false) {
        console.error('session results do not contain a valid tokenId');
      }

      if (SharedProactive.nonEmptyString(response.orgId) === false) {
        console.error('session results do not contain a valid orgId');
      }

      TokenId = response.tokenId;
      FarmId = response.context.farmId;
      options.sessionId = TokenId;
      options.farmId = FarmId;
      options.restAPI = "https://" + response.metadata.dataCenters[0].apiUrls[0].host + "/";
      chatOptions.tokenId = TokenId;
      chatOptions.farmId = FarmId;
      chatOptions.preview = {
        tenantId: response.orgId,
        interactionId: TokenId,
        previewContactEditAllowed: selectedProfile.previewContactEditAllowed,
        profile: options.profile
      };
      console.info('sessionId', TokenId);
      SharedProactive.sessionData.step = SharedProactive.Steps.StartChatPreview;
      SharedProactive.sessionData.selectedProfile = selectedProfile;
      SharedProactive.save();
      Requests.openChatPreview(options, onChatPreviewSuccess);
    };

    if (SharedProactive.sessionData.step === SharedProactive.Steps.OpenSession) {
      Requests.openSession(options, onSessionSuccess);
    } else if (SharedProactive.sessionData.step === SharedProactive.Steps.StartChatPreview) {
      Requests.openChatPreview(options, onChatPreviewSuccess);
    } else if (SharedProactive.sessionData.step === SharedProactive.Steps.WaitForEngage) {
      console.info('begin listen for engage');
      SharedProactive.openSocket(options, onSocketReceived);
    } else if (SharedProactive.sessionData.step === SharedProactive.Steps.Engaged) {
      engageChatOffer(options);
    }
  };

  var SharedProactive = {
    Mock: false,
    APIPath: 'appsvcs/rs/svc/',
    Steps: {
      LoadOffers: 'LoadOffers',
      OpenSession: 'OpenSession',
      StartChatPreview: 'StartChatPreview',
      WaitForEngage: 'WaitForEngage',
      Engaged: 'Engaged'
    },
    sessionData: {
      step: 'Unknown',
      offers: [],
      selectedProfile: null,
      options: {},
      chatOptions: {},
      messages: []
    },
    initialize: function initialize(options) {
      options = options || {};
      this.sharedOptions = options;

      if (Five9Modules) {
        ProactivePersist = Five9Modules.ProactivePersist;
        MessageTypes = Five9Modules.MessageTypes;
      }

      if (typeof options.restAPI !== 'string') {
        throw new Error('initialize() Must specify a restAPI');
      }

      if (typeof options.tenant !== 'string') {
        throw new Error('initialize() Must specify a tenant');
      }

      if (typeof options.rootUrl !== 'string') {
        throw new Error('initialize() Must specify a rootUrl');
      }

      if (options.analyticsProvider === undefined) {
        throw new Error('initialize() Must specify an analyticsProvider');
      }

      options.restAPI = SharedProactive.addTrailingSlash(options.restAPI);
      options.rootUrl = SharedProactive.addTrailingSlash(options.rootUrl);

      if (typeof options.onAccept === 'function') {
        OnEngageAcceptCallback = options.onAccept;
      } else {
        console.error('onAccept() is required');
      }

      delete options.onAccept;

      if (typeof options.onReject === 'function') {
        OnEngageRejectCallback = options.onReject;
      } else {
        console.error('onReject() is required');
      }

      delete options.onReject;

      if (options.notificationType === 'callback' && typeof options.offerCallback !== 'function') {
        console.error('a callback must be supplied');
        options.notificationType = 'notification';
      }

      if (typeof options.offerCallback === 'function') {
        OnOfferCallback = options.offerCallback;
        delete options.offerCallback;
      }

      if (options.useCustomTemplate && (typeof f9CustomPreviewOfferTemplate !== 'undefined' || typeof f9CustomProactiveOfferTemplate !== 'undefined')) {
        NotificationRootSelector = 'five9-notification-custom';
        NotificationActiveClass = 'active-new';
        ModalRootSelector = 'five9-modal-custom';
      }

      console.info('analyticsProvider', options.analyticsProvider);
      var data = ProactivePersist.loadData();

      if (data && data.step !== 'Unknown') {
        SharedProactive.sessionData = data;

        if (data.step === SharedProactive.Steps.LoadOffers) {// wait for trigger
        } else {
          resume();
        }
      }
    },
    supportsFeatures: function supportsFeatures() {
      var userAgent = navigator.userAgent;

      if (typeof userAgent.indexOf === 'function') {
        if (userAgent.indexOf('MSIE 7') !== -1 || userAgent.indexOf('MSIE 8') !== -1 || userAgent.indexOf('MSIE 9') !== -1 || userAgent.indexOf('MSIE 10') !== -1) {
          console.error('browser does not support ie10 or below');
          return false;
        }
      }

      if (!SharedProactive.supportsLocalStorage()) {
        console.error('browser does not support local storage');
        return false;
      }

      if (!SharedProactive.supportsWebSockets()) {
        console.error('browser does not support web sockets');
        return false;
      }

      return true;
    },
    supportsWebSockets: function supportsWebSockets() {
      return window.WebSocket && window.WebSocket.CLOSING === 2;
    },
    supportsLocalStorage: function supportsLocalStorage() {
      var mod = 'modernizr';

      try {
        localStorage.setItem(mod, mod);
        localStorage.removeItem(mod);
        return true;
      } catch (e) {
        return false;
      }
    },
    save: function save() {
      ProactivePersist.saveData(SharedProactive.sessionData);
    },
    loadOffers: function loadOffers(onSuccess, onError) {
      onSuccess = onSuccess || function () {};

      var options = this.sharedOptions;
      var data = SharedProactive.sessionData;

      if (data && data.step !== 'Unknown') {
        setTimeout(function () {
          onSuccess(data.offers, false);
        }, 100);
      } else {
        var onLoadOffersSuccess = function onLoadOffersSuccess(response) {
          var offers = response;
          SharedProactive.sessionData.step = SharedProactive.Steps.LoadOffers;
          SharedProactive.sessionData.options = options;
          SharedProactive.sessionData.offers = offers;

          for (var i = 0; i < offers.length; i++) {
            offers[i].numberOfOfferPerSession = offers[i].proactiveChatNumberOfOffer;
          }

          SharedProactive.save();
          onSuccess(offers, true);
        };

        Requests.loadOffers(options, onLoadOffersSuccess, onError);
      }
    },
    inProgress: function inProgress() {
      if (!SharedProactive.sessionData || SharedProactive.sessionData.step === 'Unknown' || SharedProactive.sessionData.step === SharedProactive.Steps.LoadOffers) {
        return false;
      }

      return true;
    },
    triggerOffer: function triggerOffer(offerOptions) {
      console.info('triggerOffer', offerOptions);
      offerOptions = offerOptions || {};
      var selectedProfile = offerOptions.profile;

      if (SharedProactive.sessionData.step === 'Unknown' || SharedProactive.sessionData.step === SharedProactive.Steps.LoadOffers) {
        if (_typeof(selectedProfile) !== 'object') {
          throw new Error('triggerOffer() selectedProfile is required');
        }

        if (offerOptions.onServerTerminated && typeof offerOptions.onServerTerminated === 'function') {
          this.onServerTerminated = offerOptions.onServerTerminated;
        }

        var options = this.sharedOptions;
        options.history = offerOptions.history;
        options.timeout = selectedProfile.proactiveChatOfferTimeout;
        options.question = selectedProfile.proactiveChatQuestion;
        options.profiles = selectedProfile.name;
        options.groupId = selectedProfile.groupId;
        options.tenantId = selectedProfile.tenantId;
        options.profile = selectedProfile.name;
        options.fields = selectedProfile.fields;

        if (options.timeout === undefined) {
          console.error('triggerOffer() API timeout undefined');
        }

        if (options.question === undefined) {
          console.error('triggerOffer() API question undefined');
        }

        if (options.profiles === undefined) {
          console.error('triggerOffer() API profiles undefined');
        }

        for (var key in offerOptions) {
          if (options[key] === undefined) {
            options[key] = offerOptions[key];
          }
        }

        var chatOptions;
        SharedProactive.sessionData.options = options;
        chatOptions = SharedProactive.shallowClone(options);
        chatOptions.analytics = [options.analyticsProvider, 'true'].join(',');
        delete chatOptions.restAPI;
        delete chatOptions.onAccept;
        delete chatOptions.onReject;
        delete chatOptions.question;
        delete chatOptions.timeout;
        delete chatOptions.analyticsProvider;
        SharedProactive.sessionData.chatOptions = chatOptions;

        if (!selectedProfile.enablePreviewChat && chatOptions.preview) {
          delete SharedProactive.sessionData.chatOptions.preview;
          SharedProactive.sessionData.chatOptions.profile = selectedProfile;
          options.preview = false;
        }

        var postStatusTrigger = function postStatusTrigger() {
          if (selectedProfile.enablePreviewChat) {
            // preview chat
            options.preview = true;
            options.profile = selectedProfile.name;
            SharedProactive.sessionData.selectedProfile = selectedProfile;
            SharedProactive.sessionData.step = SharedProactive.Steps.OpenSession;
            SharedProactive.save();
            resume();
          } else {
            // regular chat
            SharedProactive.save();
            engageChatOffer(options);
          }
        };

        var onStatusSuccess = function onStatusSuccess(response) {
          console.info('onStatusSuccess', response);

          if (response.resultCode === 0) {
            if (response.businessHours.openForBusiness === false) {
              return console.warn('After business hours');
            }

            var estimatedWaitMinutes = Math.round(response.ewt / 60);
            console.log('Estimated wait time is : [%d] minutes', estimatedWaitMinutes);

            if (estimatedWaitMinutes <= selectedProfile.proactiveEstimatedWaitTime) {
              postStatusTrigger();
            } else {
              console.warn('Estimated wait time too long');
            }
          } else {
            console.warn('No agents are logged in');
          }
        };

        if (options.analyticsProvider === 1) {
          postStatusTrigger();
        } else {
          console.info('numberOfOfferPerSession', selectedProfile.numberOfOfferPerSession);

          if (selectedProfile.numberOfOfferPerSession <= 0) {
            console.warn('Maximum offers per session reached');
            return;
          }

          selectedProfile.numberOfOfferPerSession--;
          SharedProactive.save();
          Requests.status(options, onStatusSuccess);
        }
      } else {
        console.warn('Proactive chat offer in progress.  aborting new offer');
        return;
      }
    },
    abandonPreview: function abandonPreview() {
      if (SharedProactive.inProgress()) {
        console.info('SharedProactive abandonPreview()');
        SharedProactive.closeSocket();
        SharedProactive.sessionData.step = SharedProactive.Steps.LoadOffers;
        SharedProactive.save();
        Requests.rejectChatPreviewOffer(SharedProactive.sessionData.options);
      }
    },
    triggerCustomerEngageAccept: function triggerCustomerEngageAccept() {
      console.info('customer accepted chat request');
      SharedProactive.closeSocket();
      SharedProactive.sessionData.step = SharedProactive.Steps.LoadOffers;
      SharedProactive.save();
      var options = SharedProactive.sessionData.options;
      var chatOptions = SharedProactive.sessionData.chatOptions;

      if (chatOptions.preview) {
        chatOptions.preview.timestamp = Date.now();
        chatOptions.preview.ownerId = options.ownerId;
        chatOptions.preview.displayName = options.displayName;
        chatOptions.preview.messages = SharedProactive.sessionData.messages;

        if (options.question && chatOptions.preview.messages.length) {
          //it is better to fix on server side, but SCC team asked to fix on UI side, so
          //replace Welcome Message with an agent initial question
          var welcomeMessage = chatOptions.preview.messages[0];
          var parsedInteraction = JSON.parse(welcomeMessage.interaction);
          parsedInteraction.content = options.question;
          welcomeMessage.interaction = JSON.stringify(parsedInteraction);
        }

        if (!SharedProactive.nonEmptyString(options.ownerId)) {
          throw new Error('triggerCustomerEngageAccept() Must specify an ownerId');
        }

        if (typeof options.displayName !== 'string') {
          throw new Error('triggerCustomerEngageAccept() Must specify an displayName');
        }

        Requests.acceptChatPreviewOffer(options);
      }

      OnEngageAcceptCallback(chatOptions);
    },
    triggerCustomerEngageReject: function triggerCustomerEngageReject() {
      console.info('customer rejected chat request');
      SharedProactive.closeSocket();
      SharedProactive.sessionData.step = SharedProactive.Steps.LoadOffers;
      SharedProactive.save();
      var options = SharedProactive.sessionData.options;

      if (options.preview) {
        Requests.rejectChatPreviewOffer(options);
      }

      OnEngageRejectCallback();
    },
    hideChatOffer: function hideChatOffer() {
      console.log('hideChatOffer');
      clearTimeout(SharedProactive.timeoutId);
      var notificationFrame;
      notificationFrame = document.getElementById(NotificationRootSelector);

      if (notificationFrame) {
        notificationFrame.classList.remove(NotificationActiveClass);
      }

      notificationFrame = document.getElementById(ModalRootSelector);

      if (notificationFrame) {
        notificationFrame.classList.remove(NotificationActiveClass);
      }
    },
    showChatOffer: function showChatOffer(options, rootSelector, template) {
      options = options || {};

      if (options.timeout === undefined) {
        throw new Error('showChatOffer() Must specify a timeout');
      }

      var onAccept = options.onAccept || function () {};

      var onReject = options.onReject || function () {};

      var notificationFrame;

      var showNotification = function showNotification() {
        notificationFrame = document.getElementById(rootSelector);
        notificationFrame.classList.add(NotificationActiveClass);
      };

      notificationFrame = document.getElementById(rootSelector);

      if (notificationFrame) {
        if (notificationFrame.parentElement) {
          console.log('removing notificationFrame');
          notificationFrame.parentElement.removeChild(notificationFrame);
          notificationFrame = null;

          if (typeof Five9SocialWidget !== 'undefined') {
            Five9SocialWidget.removeEmbeddedFrame();
          }

          document.body.removeChild(document.getElementById('five9-notification-container'));
        }
      }

      if (!notificationFrame) {
        notificationFrame = document.createElement('div');
        notificationFrame.id = 'five9-notification-container';
        notificationFrame.innerHTML = template;
        document.body.appendChild(notificationFrame);
        var acceptButton = notificationFrame.querySelector('#five9_offerAccepted');

        if (acceptButton) {
          acceptButton.addEventListener('click', function (e) {
            SharedProactive.hideChatOffer();

            if (options.preview !== true && typeof gtag === 'function') {
              gtag('event', 'Proactive Chat Accepted', {
                'event_category': 'Five9',
                'event_label': options.profile
              });
            }

            onAccept();
          });
        }

        var refuseMethod = function refuseMethod(e) {
          SharedProactive.hideChatOffer();

          if (options.preview !== true && typeof gtag === 'function') {
            gtag('event', 'Proactive Chat Rejected', {
              'event_category': 'Five9',
              'event_label': options.profile
            });
          }

          onReject();
        };

        var refuseButton = notificationFrame.querySelector('#five9_offerExit');

        if (refuseButton) {
          refuseButton.addEventListener('click', refuseMethod);
        }

        refuseButton = notificationFrame.querySelector('#five9_offerRefused');

        if (refuseButton) {
          refuseButton.addEventListener('click', refuseMethod);
        }
      }

      setTimeout(function () {
        showNotification();
      }, 100);

      if (options.timeout) {
        SharedProactive.timeoutId = setTimeout(function () {
          SharedProactive.hideChatOffer();
          onReject();
        }, options.timeout * 1000);
      }
    },
    showChatOfferNotification: function showChatOfferNotification(options) {
      options = options || {};

      if (typeof options.question !== 'string') {
        throw new Error('showChatOfferNotification() Must specify a question');
      }

      var headerText;
      var messageText = '';
      var proactiveClass = 'five9-proactive five9-notification';
      var defaultAcceptText;
      var displayName = '';

      if (options.preview) {
        headerText = options.header || DefaultHeaderText;
        messageText = options.question;
        proactiveClass += ' five9-inverse';
        defaultAcceptText = DefaultPreviewAcceptText;

        if (options.displayName) {
          var now = formatTime(new Date());
          displayName = options.displayName + ' <span class="display-time">' + now + '</span>';
        }
      } else {
        headerText = options.question;
        messageText = '';
        defaultAcceptText = DefaultAcceptText;
      }

      var acceptText = options.acceptText || defaultAcceptText;
      var closeText = options.closeText || 'I\'m OK for now, thanks.';
      var template;

      if (options.useCustomTemplate && options.preview && typeof f9CustomPreviewOfferTemplate !== 'undefined') {
        template = f9CustomPreviewOfferTemplate;
      } else if (options.useCustomTemplate && !options.preview && typeof f9CustomProactiveOfferTemplate !== 'undefined') {
        template = f9CustomProactiveOfferTemplate;
      } else {
        template = '<div id="five9-notification" class="' + proactiveClass + '">';
        template += '<span class="five9-icon"></span>';
        template += '<span id="five9_offerExit" class="five9-exit"></span>';
        template += '<span class="five9-text">' + headerText + '</span>';
        template += '<div class="five9-agent-text">' + displayName + '</div>';
        template += '<div class="five9-message-text">' + messageText + '</div>';
        template += '<div id="five9_offerAccepted" class="five9-start-button">' + acceptText + '</div>';
        template += '<div id="five9_offerRefused" class="five9-close-button">' + closeText + '</div>';
        template += '</div>';
      }

      this.showChatOffer(options, NotificationRootSelector, template);
    },
    showChatOfferModal: function showChatOfferModal(options) {
      options = options || {};

      if (typeof options.question !== 'string') {
        throw new Error('showChatOfferModal() Must specify a question');
      }

      var headerText;
      var messageText = '';
      var proactiveClass = 'five9-proactive five9-modal';
      var defaultAcceptText;
      var displayName = '';

      if (options.preview) {
        headerText = options.header || DefaultHeaderText;
        messageText = options.question;
        proactiveClass += ' five9-inverse';
        defaultAcceptText = DefaultPreviewAcceptText;

        if (options.displayName) {
          var now = formatTime(new Date());
          displayName = options.displayName + ' <span class="display-time">' + now + '</span>';
        }
      } else {
        headerText = options.question;
        messageText = '';
        defaultAcceptText = DefaultAcceptText;
      }

      var acceptText = options.acceptText || 'Start Live Chat';
      var closeText = options.closeText || 'I\'m OK for now, thanks.';
      var template;

      if (options.useCustomTemplate && options.preview) {
        template = '<div id="five9-modal-custom" class=""><div class="five9-overlay-custom">' + f9CustomPreviewOfferTemplate + '</div></div>';
      } else if (options.useCustomTemplate && !options.preview) {
        template = '<div id="five9-modal-custom" class=""><div class="five9-overlay-custom">' + f9CustomProactiveOfferTemplate + '</div></div>';
      } else {
        template = '<div id="five9-modal" class="">';
        template += '<div class="five9-overlay">';
        template += '<div class="' + proactiveClass + '">';
        template += '<span class="five9-icon"></span>';
        template += '<span id="five9_offerExit" class="five9-exit"></span>';
        template += '<span class="five9-text">' + headerText + '</span>';
        template += '<div class="five9-agent-text">' + displayName + '</div>';
        template += '<div class="five9-message-text">' + messageText + '</div>';
        template += '<div id="five9_offerAccepted" class="five9-start-button">' + acceptText + '</div>';
        template += '<div id="five9_offerRefused" class="five9-close-button">' + closeText + '</div>';
        template += '</div>';
        template += '</div>';
        template += '</div>';
      }

      this.showChatOffer(options, ModalRootSelector, template);
    },
    // utility
    xhr: function xhr(options, onSuccess, onError) {
      var url = options.url;
      var verb = options.verb || 'GET';
      var payload = options.payload || null;

      onSuccess = onSuccess || function () {};

      onError = onError || function () {};

      try {
        url = encodeURI(url);
        var xhr = new XMLHttpRequest();

        if (xhr == null) {
          return;
        }

        var onXHRError = function onXHRError(err) {
          var textStatus = 'error';

          try {
            textStatus = JSON.parse(xhr.responseText);
          } // eslint-disable-next-line no-empty
          catch (err) {}

          onError(xhr, textStatus, err);
        };

        console.info('xhr(' + url + ')');
        xhr.open(verb, url, true);

        if (verb !== 'GET') {
          xhr.withCredentials = true;
        }

        xhr.setRequestHeader('Content-Type', 'application/json');

        if (TokenId !== false) {
          xhr.setRequestHeader('Authorization', 'Bearer-' + TokenId);
        }

        if (FarmId !== false) {
          xhr.setRequestHeader('farmId', FarmId);
        }

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 204) {
              try {
                var json = JSON.parse(xhr.responseText);
                onSuccess(json);
              } catch (err) {
                onXHRError(err);
              }
            } else {
              onXHRError();
            }
          }
        };

        xhr.onerror = function () {
          onXHRError();
        };

        if (payload === null) {
          xhr.send();
        } else {
          xhr.send(JSON.stringify(payload));
        }
      } catch (err) {
        onError(err);
      }
    },
    nonEmptyString: function nonEmptyString(s) {
      if (typeof s !== 'string') {
        return false;
      }

      return s !== '';
    },
    generateAnonEmail: function generateAnonEmail() {
      return this.generateGuid() + '@anonymous.com';
    },
    generateGuid: function generateGuid() {
      // rfc4122 version 4 compliant
      // see http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
      // Original solution - http://www.broofa.com/2008/09/javascript-uuid-function/
      // Updated with - http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
      var d = Date.now();
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : r & 0x7 | 0x8).toString(16);
      });
      return uuid;
    },
    addTrailingSlash: function addTrailingSlash(s) {
      return s.substr(-1) === '/' ? s : s + '/';
    },
    shallowClone: function shallowClone(o) {
      var dest = {}; // eslint-disable-next-line guard-for-in

      for (var key in o) {
        dest[key] = o[key];
      }

      return dest;
    },
    objectToQuery: function objectToQuery(o) {
      var a = [];

      for (var key in o) {
        if (o.hasOwnProperty(key)) {
          a.push(key + '=' + encodeURIComponent(o[key]));
        }
      }

      var s = '';

      for (var i = 0; i < a.length; i++) {
        s += a[i];

        if (i !== a.length - 1) {
          s += '&';
        }
      }

      return s;
    },
    formatString: function formatString(s) {
      // simple format method.  ex: Utils.format('string {0} test {1}', 'aaa', 'bbb')
      // more interesting string manipulation should use underscore.string
      var args = arguments;
      return s.replace(/\{(\d+)\}/g, function (match, number) {
        number = parseInt(number, 10) + 1;

        if (typeof args[number] === 'undefined') {
          return undefined;
        }

        var arg = args[number];

        if (_typeof(arg) === 'object') {
          arg = JSON.stringify(arg);
        }

        return arg;
      });
    },
    openSocket: function openSocket(options, onMessage) {
      console.log('openSocket()', options);
      var restAPI = options.restAPI;
      var socketLocation = restAPI.substring(0, restAPI.length - 1);
      socketLocation = socketLocation.replace('http://', '');
      socketLocation = socketLocation.replace('https://', '');
      var protocol = 'ws';

      if (restAPI.indexOf('https') !== -1) {
        protocol = 'wss';
      }

      var url = protocol + '://' + socketLocation + '/appsvcs/ws';
      url += '?Authorization=Bearer-' + options.sessionId;
      url += '&farmId=' + options.farmId;
      console.info('socket url', url);

      if (SharedProactive.Mock) {
        setTimeout(function () {
          var data = JSON.stringify({
            payLoad: {
              interaction: '{"timestamp":1464976104,"content":"Hello","id":"5b6f6298-29b3-11e6-880d-005056a4db18","ownerId":"138","contentType":1,"displayName":"User One","messageId":"0cf0715b-c7e2-4f9b-aef8-587c9033de71","fromType":1}',
              interactionId: "5b6f6298-29b3-11e6-880d-005056a4db18",
              messageId: MessageTypes.MSG_CHAT_AGENT_ACCEPT,
              status: 1,
              userId: "405361"
            }
          });
          onMessage({
            data: data
          });
        }, 1000);
        setTimeout(function () {
          onMessage({
            data: JSON.stringify({
              payLoad: {
                question: 'FROM AGENT ENGAGE',
                engaged: 1
              },
              context: {
                messageId: MessageTypes.PREVIEW_ENGAGE_ITEM
              }
            })
          });
          /*
                    onMessage({
                      data: JSON.stringify({
                        payLoad: {
                          interactionId: SharedProactive.sessionData.options.sessionId
                        },
                        context: {
                          messageId: MessageTypes.INTERACTION_TERMINATE
                        }
                      })
                    });
          */
        }, 2000);
      } else {
        this.socket = new WebSocket(url);
        this.socket.onmessage = onMessage;
      }
    },
    closeSocket: function closeSocket() {
      console.log('closeSocket()');

      if (this.socket) {
        this.socket.close();
        delete this.socket;
      }
    }
  };

  if (Five9Modules) {
    Five9Modules.SharedProactive = SharedProactive;
  }
})();

(function () {
  var MessageTypes = {
    /**
     *Temporary to remove
     */
    MSG_TO_IGNORE_1: 1111,
    MSG_TO_IGNORE_2: 1101,
    MSG_TO_IGNORE_3: 1102,
    MSG_BROWSER_NOT_SUPPORTED: -100,
    MSG_CONNECTION_NOT_AVAILABLE: -101,
    RESULT_SUCCESS: 1,
    RESULT_ERROR: -1,
    TRANSFER_TO_GROUP: 1751,
    TRANSFERT_TO_AGENT: 1752,
    AGENT_TRANSFER_AGENT: 1753,
    INTERACTION_TERMINATED: 19507,
    MSG_CHAT_CLIENT_REQUEST: 17001,
    MSG_CHAT_CLIENT_MESSAGE: 17002,
    MSG_CHAT_CLIENT_TERMINATE: 17003,
    MSG_CHAT_CLIENT_MESSAGE_RECEIVED: 17004,
    MSG_CHAT_CLIENT_TYPING: 17005,
    // MSG_CHAT_CLIENT_TRANSFER_TO_GROUP:   17007,
    MSG_NO_SERVICE: 17008,
    PREVIEW_OFFER_ITEM: 19600,
    PREVIEW_ASSIGN_ITEM: 19601,
    PREVIEW_REJECT_ITEM: 19602,
    PREVIEW_ENGAGE_ITEM: 19603,
    PREVIEW_ENGAGE_ACCEPT_ITEM: 19604,
    PREVIEW_ENGAGE_REJECT_ITEM: 19605,
    CUSTOMER_CONTACT_UPDATE: 19608,
    PREVIEW_OFFER_CHERRY_ITEM: 19700,
    PREVIEW_LOCK_CHERRY_ITEM: 19701,
    MSG_CHAT_AGENT_ACCEPT: 18000,
    MSG_CHAT_AGENT_MESSAGE: 18001,
    MSG_CHAT_AGENT_TERMINATE: 18002,
    MSG_CHAT_AGENT_MESSAGE_TO_AGENT: 18004,
    MSG_CHAT_AGENT_TYPING: 18005,
    MSG_CHAT_AGENT_MESSAGE_RECEIVED: 18007,
    MSG_CHAT_AGENT_ADD_AGENT_TO_CHAT: 18008,
    MSG_CHAT_AGENT_REMOVE_AGENT_FROM_CHAT: 18009,
    MSG_CHAT_SIGHTCALL_ESCALATION: 18012,
    MSG_CHAT_SIGHTCALL_VIDEO_ACTIVATED: 18013,
    MSG_CHAT_SIGHTCALL_VIDEO_TERMINATED: 18014,
    MSG_CHAT_SIGHTCALL_CANCELED: 18015,
    MSG_CHAT_AGENT_CONFERENCE_AGENT: 18020,
    MSG_CHAT_AGENT_COMFORT_MESSAGE: 18021,
    MSG_CHAT_AUTO_CLOSE: 18022,
    MSG_TEXT: 1,
    MSG_HTML: 2,
    MSG_VOICE: 3,
    MSG_VIDEO: 4,
    MSG_FILE: 5,
    STATE_PENDING: 1,
    STATE_DELIVERED: 2,
    STATE_TYPING: 3,
    STATE_DELETING: 4,
    FROM_AGENT: 1,
    FROM_CLIENT: 2,
    FROM_SERVER: 3,
    FROM_TYPING: 4,
    CHAT_STATE_ACTIVE: 1,
    CHAT_STATE_TEMINATED: 2,
    IN: 1,
    OUT: 2,
    getDescription: function getDescription(messageId) {
      switch (messageId) {
        case this.MSG_CHAT_CLIENT_REQUEST:
          return "ChatClientRequest";

        case this.MSG_CHAT_CLIENT_MESSAGE:
          return "ChatClientMessage";

        case this.MSG_CHAT_CLIENT_TERMINATE:
          return "ChatClientTerminate";

        case this.MSG_CHAT_CLIENT_MESSAGE_RECEIVED:
          return "ChatClientMessageReceived";

        case this.MSG_CHAT_CLIENT_TYPING:
          return "ChatClientTyping";

        case this.PREVIEW_OFFER_ITEM:
          return 'PREVIEW_OFFER_ITEM';

        case this.PREVIEW_ASSIGN_ITEM:
          return 'PREVIEW_ASSIGN_ITEM';

        case this.PREVIEW_REJECT_ITEM:
          return 'PREVIEW_REJECT_ITEM';

        case this.PREVIEW_ENGAGE_ITEM:
          return 'PREVIEW_ENGAGE_ITEM';

        case this.PREVIEW_ENGAGE_ACCEPT_ITEM:
          return 'PREVIEW_ENGAGE_ACCEPT_ITEM';

        case this.PREVIEW_ENGAGE_REJECT_ITEM:
          return 'PREVIEW_ENGAGE_REJECT_ITEM';

        case this.MSG_CHAT_AGENT_ACCEPT:
          return "ChatAgentAccept";

        case this.MSG_CHAT_AGENT_MESSAGE:
          return "ChatAgentMessage";

        case this.MSG_CHAT_AGENT_TERMINATE:
          return "ChatAgentTerminate";

        case this.MSG_CHAT_AGENT_MESSAGE_TO_AGENT:
          return "ChatAgentToAgent";

        case this.MSG_CHAT_AGENT_TYPING:
          return "ChatAgentTyping";

        case this.MSG_CHAT_AGENT_MESSAGE_RECEIVED:
          return "ChatAgentMessageReceived";

        case this.MSG_CHAT_AGENT_ADD_AGENT_TO_CHAT:
          return "AddAgentToConference";

        case this.MSG_CHAT_AGENT_REMOVE_AGENT_FROM_CHAT:
          return "RemoveAgentFromConference";

        case this.MSG_CHAT_AGENT_COMFORT_MESSAGE:
          return "ChatAgentComfortMessage";

        case this.MSG_CHAT_AUTO_CLOSE:
          return "ChatAutoCloseWarning";

        default:
          return "Unknown message id [" + messageId + "]";
      }
    }
  };
  /**
   *No longer needed
   */
  // MSG_GET_TENANT_ID: 97,
  // MSG_GET_USER_LOGGED_IN: 98,
  // MSG_GET_PROFILE_SURVEY: 700,
  // MSG_CHAT_KEEP_ALIVE: 17000,
  // MSG_CHAT_CLIENT_RENEW: 17006,
  // MSG_GET_SESSION_INFORMATION: 19000,

  if (Five9Modules) {
    Five9Modules.MessageTypes = MessageTypes;
  }
})();
