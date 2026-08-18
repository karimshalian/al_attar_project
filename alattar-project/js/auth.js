/* Al-Attar — auth.js
   Renders the account icon behavior: login/signup modal when logged out,
   a dropdown (orders / rewards / admin / logout) when logged in,
   order history, and loyalty rewards.
   Depends on supabase-client.js having run first (window.sb, window.AUTH).
*/

const AUTHT = {
  ar: {
    login: "تسجيل الدخول",
    signup: "حساب جديد",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",

    fullName: "الاسم الكامل",
    phone: "رقم الجوال",

    loginBtn: "دخول",
    signupBtn: "إنشاء الحساب",

    switchToSignup: "ما عندك حساب؟ سجّل واحد",
    switchToLogin: "عندك حساب؟ سجّل دخول",

    myOrders: "طلباتي",
    myRewards: "نقاطي",

    rewardsTitle: "نقاط العطّار",
    pointsBalance: "رصيد النقاط",
    pointsValue: "القيمة المتاحة",
    expires: "تنتهي",

    earnRule:
      "كل 1 د.أ = 1 نقطة، وكل 10 نقاط = 1 د.أ. النقاط صالحة لمدة 6 أشهر من تاريخ اكتسابها وتُضاف بعد تسليم الطلب.",

    noRewards: "ما في حركات نقاط بعد.",

    adminPanel: "لوحة التحكم",
    logout: "تسجيل خروج",

    orderHistTitle: "طلباتي السابقة",
    noOrders: "ما في طلبات سابقة بعد.",

    err: "صار خطأ، تأكد من البيانات وحاول مرة ثانية.",
    close: "إغلاق",

    orDivider: "أو",
    withGoogle: "المتابعة عبر Google",
    withFacebook: "المتابعة عبر Facebook",

    welcome: n => `أهلاً ${n || ""}`,
  },

  en: {
    login: "Log in",
    signup: "Sign up",
    email: "Email",
    password: "Password",

    fullName: "Full name",
    phone: "Phone",

    loginBtn: "Log in",
    signupBtn: "Create account",

    switchToSignup: "No account? Sign up",
    switchToLogin: "Have an account? Log in",

    myOrders: "My Orders",
    myRewards: "My Rewards",

    rewardsTitle: "Al-Attar Points",
    pointsBalance: "Points balance",
    pointsValue: "Available value",
    expires: "Expires",

    earnRule:
      "Every 1 JD = 1 point, and every 10 points = 1 JD. Points are valid for 6 months from the date earned and are added after order delivery.",

    noRewards: "No points activity yet.",

    adminPanel: "Admin Panel",
    logout: "Log out",

    orderHistTitle: "My past orders",
    noOrders: "No past orders yet.",

    err: "Something went wrong, check your info and try again.",
    close: "Close",

    orDivider: "or",
    withGoogle: "Continue with Google",
    withFacebook: "Continue with Facebook",

    welcome: n => `Hi ${n || ""}`,
  }
};


/* =========================================================
   LANGUAGE
========================================================= */

function authLang() {
  try {
    return localStorage.getItem("attar_lang") || "ar";
  } catch (e) {
    return "ar";
  }
}

const at = () => AUTHT[authLang()];


/* =========================================================
   AUTH UI STATE
========================================================= */

const AUS = {
  view: "closed",
  mode: "login",
  busy: false,
  err: "",

  orders: null,

  rewards: null,
  rewardTx: null,
};


/* =========================================================
   ROOT
========================================================= */

function authRoot() {
  let el = document.getElementById("auth-root");

  if (!el) {
    el = document.createElement("div");
    el.id = "auth-root";
    document.body.appendChild(el);
  }

  return el;
}


/* =========================================================
   PROFILE REFRESH
   Important:
   The Supabase session may be available before the profile
   query finishes. This makes sure admin / manager roles are
   loaded before showing the account menu.
========================================================= */

async function authRefreshProfile() {

  if (!window.AUTH || !window.AUTH.user) {
    return null;
  }

  try {

    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", window.AUTH.user.id)
      .single();

    if (error) {
      console.error("profile refresh error:", error);
      return window.AUTH.profile || null;
    }

    window.AUTH.profile = data || null;

    return window.AUTH.profile;

  } catch (err) {

    console.error("profile refresh exception:", err);

    return window.AUTH.profile || null;
  }
}


/* =========================================================
   RENDER
========================================================= */

function authRender() {

  const root = authRoot();
  const T = at();

  if (AUS.view === "closed") {
    root.innerHTML = "";
    return;
  }


  /* =======================================================
     ACCOUNT MENU
  ======================================================= */

  if (AUS.view === "menu") {

    const name =
      window.AUTH.profile?.full_name ||
      window.AUTH.user?.email ||
      "";

    const role = window.AUTH.profile?.role;

    const isStaff =
      role === "admin" ||
      role === "manager";

    root.innerHTML = `

      <div
        class="auth-ov"
        onclick="authUI.close()">
      </div>

      <div class="auth-menu">

        <div class="auth-menu-hi">
          ${T.welcome(name)}
        </div>

        <button
          class="auth-menu-item"
          onclick="authUI.openOrders()">
          📦 ${T.myOrders}
        </button>

        <button
          class="auth-menu-item"
          onclick="authUI.openRewards()">
          🌿 ${T.myRewards}
        </button>

        ${
          isStaff
            ? `
              <a
                class="auth-menu-item"
                href="admin.html">
                🛠️ ${T.adminPanel}
              </a>
            `
            : ""
        }

        <button
          class="auth-menu-item danger"
          onclick="authUI.logout()">
          ↪ ${T.logout}
        </button>

      </div>
    `;

    return;
  }


  /* =======================================================
     ORDERS
  ======================================================= */

  if (AUS.view === "orders") {

    const body =
      AUS.orders === null

        ? `
          <div class="auth-loading">
            …
          </div>
        `

        : AUS.orders.length === 0

          ? `
            <div class="auth-empty">
              ${T.noOrders}
            </div>
          `

          : AUS.orders.map(o => `

            <div class="order-card">

              <div class="order-card-h">

                <b>
                  #${o.id.slice(0, 8)}
                </b>

                <span class="order-status s-${o.status}">
                  ${o.status}
                </span>

              </div>

              <div class="order-card-items">

                ${(o.order_items || []).map(it => `

                  <div class="oi-row">

                    <span>
                      ${
                        authLang() === "ar"
                          ? it.name_ar
                          : it.name_en
                      }
                      × ${it.qty}
                    </span>

                    <span>
                      ${Number(it.price * it.qty).toFixed(2)}
                    </span>

                  </div>

                `).join("")}

              </div>

              ${
                Number(o.loyalty_points_redeemed || 0) > 0
                  ? `
                    <div class="oi-row">
                      <span>
                        ${authLang() === "ar"
                          ? "نقاط مستخدمة"
                          : "Points used"}
                      </span>

                      <span>
                        -${o.loyalty_points_redeemed}
                      </span>
                    </div>
                  `
                  : ""
              }

              ${
                Number(o.loyalty_discount || 0) > 0
                  ? `
                    <div class="oi-row">
                      <span>
                        ${authLang() === "ar"
                          ? "خصم النقاط"
                          : "Points discount"}
                      </span>

                      <span>
                        -${Number(o.loyalty_discount).toFixed(2)}
                      </span>
                    </div>
                  `
                  : ""
              }

              ${
                Number(o.loyalty_points_earned || 0) > 0
                  ? `
                    <div class="oi-row">

                      <span>
                        ${authLang() === "ar"
                          ? "نقاط مكتسبة"
                          : "Points earned"}
                      </span>

                      <span>
                        +${o.loyalty_points_earned}
                      </span>

                    </div>
                  `
                  : ""
              }

              <div class="order-card-total">

                <span>
                  ${
                    authLang() === "ar"
                      ? "الإجمالي"
                      : "Total"
                  }
                </span>

                <b>
                  ${Number(o.total).toFixed(2)}
                </b>

              </div>

            </div>

          `).join("");


    root.innerHTML = `

      <div
        class="auth-ov"
        onclick="authUI.close()">
      </div>

      <div class="auth-panel">

        <div class="auth-panel-head">

          <b>
            ${T.orderHistTitle}
          </b>

          <button
            class="auth-x"
            onclick="authUI.close()">
            ✕
          </button>

        </div>

        <div class="auth-panel-body">
          ${body}
        </div>

      </div>
    `;

    return;
  }


  /* =======================================================
     REWARDS
  ======================================================= */

  if (AUS.view === "rewards") {

    const R = AUS.rewards;
    const tx = AUS.rewardTx;

    const val =
      R
        ? Number(R.value_jod || 0).toFixed(2)
        : "0.00";


    const expiry =
      R?.next_expiry
        ? new Date(R.next_expiry).toLocaleDateString(
            authLang() === "ar"
              ? "ar-JO"
              : "en-GB",
            {
              year: "numeric",
              month: "short",
              day: "numeric"
            }
          )
        : null;


    const labels = {

      earned:
        authLang() === "ar"
          ? "مكتسبة"
          : "Earned",

      redeemed:
        authLang() === "ar"
          ? "مستخدمة"
          : "Redeemed",

      refund:
        authLang() === "ar"
          ? "مسترجعة"
          : "Refunded",

      expired:
        authLang() === "ar"
          ? "منتهية"
          : "Expired",

      adjustment:
        authLang() === "ar"
          ? "تعديل"
          : "Adjustment"

    };


    const txHtml =

      tx === null

        ? `
          <div class="auth-loading">
            …
          </div>
        `

        : tx.length === 0

          ? `
            <div class="auth-empty">
              ${T.noRewards}
            </div>
          `

          : tx.map(x => `

              <div class="reward-tx">

                <div>

                  <b>
                    ${labels[x.type] || x.type}
                  </b>

                  <span>

                    ${
                      new Date(x.created_at)
                        .toLocaleDateString(
                          authLang() === "ar"
                            ? "ar-JO"
                            : "en-GB"
                        )
                    }

                    ${
                      x.type === "earned" &&
                      x.expires_at

                        ? `
                          · ${T.expires}
                          ${
                            new Date(x.expires_at)
                              .toLocaleDateString(
                                authLang() === "ar"
                                  ? "ar-JO"
                                  : "en-GB"
                              )
                          }
                        `

                        : ""
                    }

                  </span>

                </div>

                <strong
                  class="${
                    Number(x.points) >= 0
                      ? "plus"
                      : "minus"
                  }">

                  ${
                    Number(x.points) >= 0
                      ? "+"
                      : ""
                  }

                  ${x.points}

                </strong>

              </div>

          `).join("");


    root.innerHTML = `

      <div
        class="auth-ov"
        onclick="authUI.close()">
      </div>

      <div class="auth-panel rewards-panel">

        <div class="auth-panel-head">

          <b>
            ${T.rewardsTitle}
          </b>

          <button
            class="auth-x"
            onclick="authUI.close()">
            ✕
          </button>

        </div>


        <div class="auth-panel-body">

          ${
            R === null

              ? `
                <div class="auth-loading">
                  …
                </div>
              `

              : `

                <div class="reward-balance">

                  <div>

                    <span>
                      ${T.pointsBalance}
                    </span>

                    <b>
                      ${Number(R.points || 0)} pts
                    </b>

                  </div>


                  <div>

                    <span>
                      ${T.pointsValue}
                    </span>

                    <b>

                      ${val}

                      ${
                        authLang() === "ar"
                          ? "د.أ"
                          : "JD"
                      }

                    </b>

                  </div>

                </div>


                ${
                  expiry &&
                  Number(R.next_expiry_points || 0) > 0

                    ? `

                      <div class="reward-expiry">

                        ⏳

                        ${R.next_expiry_points}

                        ${
                          authLang() === "ar"
                            ? "نقطة"
                            : "points"
                        }

                        ${T.expires}

                        ${expiry}

                      </div>

                    `

                    : ""
                }


                <div class="reward-rule">
                  ${T.earnRule}
                </div>

              `
          }


          <div class="reward-history">
            ${txHtml}
          </div>

        </div>

      </div>
    `;

    return;
  }


  /* =======================================================
     LOGIN / SIGNUP
  ======================================================= */

  const isSignup =
    AUS.mode === "signup";


  root.innerHTML = `

    <div
      class="auth-ov"
      onclick="authUI.close()">
    </div>


    <div class="auth-panel">

      <div class="auth-panel-head">

        <b>

          ${
            isSignup
              ? T.signup
              : T.login
          }

        </b>

        <button
          class="auth-x"
          onclick="authUI.close()">
          ✕
        </button>

      </div>


      <div class="auth-panel-body">


        ${
          AUS.err
            ? `
              <div class="auth-err">
                ${AUS.err}
              </div>
            `
            : ""
        }


        <div class="auth-social">

          <button
            type="button"
            class="auth-social-btn google"
            onclick="authUI.oauth('google')">

            <img src="assets/img/google-icon.svg" alt="" onerror="this.style.display='none'">
            ${T.withGoogle}

          </button>

          <button
            type="button"
            class="auth-social-btn facebook"
            onclick="authUI.oauth('facebook')">

            <img src="assets/img/facebook-icon.svg" alt="" onerror="this.style.display='none'">
            ${T.withFacebook}

          </button>

        </div>

        <div class="auth-or">
          <span>${T.orDivider}</span>
        </div>

        <form onsubmit="authUI.submit(event)">


          ${
            isSignup

              ? `
                <input
                  class="auth-field"
                  id="af-name"
                  placeholder="${T.fullName}"
                  required>
              `

              : ""
          }


          <input
            class="auth-field"
            id="af-email"
            type="email"
            placeholder="${T.email}"
            required>


          <input
            class="auth-field"
            id="af-pass"
            type="password"
            placeholder="${T.password}"
            minlength="6"
            required>


          ${
            isSignup

              ? `
                <input
                  class="auth-field"
                  id="af-phone"
                  placeholder="${T.phone}">
              `

              : ""
          }


          <button
            class="auth-submit"
            ${AUS.busy ? "disabled" : ""}>

            ${
              AUS.busy

                ? "…"

                : (
                    isSignup
                      ? T.signupBtn
                      : T.loginBtn
                  )
            }

          </button>

        </form>


        <button
          class="auth-switch"
          onclick="authUI.toggleMode()">

          ${
            isSignup
              ? T.switchToLogin
              : T.switchToSignup
          }

        </button>

      </div>

    </div>
  `;
}


/* =========================================================
   PUBLIC UI METHODS
========================================================= */

window.authUI = {


  /* =======================================================
     OPEN ACCOUNT MENU
     FIX:
     Refresh the profile BEFORE rendering the menu so the
     admin / manager CRM option does not disappear.
  ======================================================= */

  async open() {

    AUS.err = "";


    if (!window.AUTH || !window.AUTH.user) {

      AUS.view = "login";
      AUS.mode = "login";

      authRender();

      return;
    }


    /*
      Immediately open a small loading state.
      This prevents an old / missing role from being used.
    */

    const root = authRoot();

    root.innerHTML = `

      <div
        class="auth-ov"
        onclick="authUI.close()">
      </div>

      <div class="auth-menu">

        <div class="auth-loading">
          …
        </div>

      </div>
    `;


    /*
      Always refresh the profile when opening the account
      menu.

      This guarantees that:
      admin   -> sees CRM
      manager -> sees CRM
      customer -> does not see CRM
    */

    await authRefreshProfile();


    AUS.view = "menu";
    AUS.mode = "login";

    authRender();
  },


  close() {

    AUS.view = "closed";

    authRender();
  },


  toggleMode() {

    AUS.mode =
      AUS.mode === "login"
        ? "signup"
        : "login";

    AUS.err = "";

    authRender();
  },


  /* =======================================================
     SOCIAL LOGIN (Google / Facebook)
     Requires the provider to be enabled + configured in the
     Supabase dashboard (Authentication → Providers) first.
  ======================================================= */

  async oauth(provider) {

    AUS.err = "";
    AUS.busy = true;
    authRender();

    const { error } =
      await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href
        }
      });

    if (error) {
      AUS.busy = false;
      AUS.err = error.message || at().err;
      authRender();
    }

    /* On success Supabase redirects the browser away to the
       provider's login page, so there's nothing else to do here. */
  },


  /* =======================================================
     LOGIN / SIGNUP
  ======================================================= */

  async submit(e) {

    e.preventDefault();


    const email =
      document
        .getElementById("af-email")
        .value
        .trim();


    const pass =
      document
        .getElementById("af-pass")
        .value;


    const name =
      AUS.mode === "signup"

        ? document
            .getElementById("af-name")
            .value
            .trim()

        : "";


    const phone =
      AUS.mode === "signup"

        ? document
            .getElementById("af-phone")
            .value
            .trim()

        : "";


    AUS.busy = true;
    AUS.err = "";

    authRender();


    try {


      /* SIGNUP */

      if (AUS.mode === "signup") {

        const { error } =
          await sb.auth.signUp({

            email,

            password: pass,

            options: {

              data: {
                full_name: name
              }

            }

          });


        if (error) {
          throw error;
        }


        /*
          Best effort:
          attach phone to the profile once session exists.
        */

        if (phone) {

          setTimeout(async () => {

            if (window.AUTH.user) {

              await sb
                .from("profiles")
                .update({
                  phone
                })
                .eq(
                  "id",
                  window.AUTH.user.id
                );

            }

          }, 800);

        }

      }


      /* LOGIN */

      else {

        const { error } =
          await sb.auth
            .signInWithPassword({

              email,

              password: pass

            });


        if (error) {
          throw error;
        }


        /*
          Explicitly refresh user + profile after login.
          This makes the admin role available immediately.
        */

        const {
          data: {
            user
          }
        } = await sb.auth.getUser();


        if (user) {

          window.AUTH.user = user;

          await authRefreshProfile();

        }

      }


      AUS.busy = false;
      AUS.view = "closed";

      authRender();


    } catch (err) {


      AUS.busy = false;

      AUS.err = at().err;

      authRender();


      console.error(
        "auth error:",
        err
      );

    }
  },


  /* =======================================================
     LOGOUT
  ======================================================= */

  async logout() {

    await sb.auth.signOut();


    window.AUTH.user = null;
    window.AUTH.profile = null;


    AUS.view = "closed";

    authRender();
  },


  /* =======================================================
     ORDERS
  ======================================================= */

  async openOrders() {

    AUS.view = "orders";
    AUS.orders = null;

    authRender();


    const {
      data,
      error
    } = await sb

      .from("orders")

      .select(`
        id,
        status,
        total,
        loyalty_points_earned,
        loyalty_points_redeemed,
        loyalty_discount,
        created_at,
        order_items(
          name_ar,
          name_en,
          price,
          qty
        )
      `)

      .order(
        "created_at",
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        "orders load error:",
        error
      );

      AUS.orders = [];

    }

    else {

      AUS.orders =
        data || [];

    }


    authRender();
  },


  /* =======================================================
     REWARDS
  ======================================================= */

  async openRewards() {

    AUS.view = "rewards";

    AUS.rewards = null;
    AUS.rewardTx = null;

    authRender();


    const [
      summary,
      history
    ] = await Promise.all([


      /*
        Automatically expires old point batches
        and returns the current balance.
      */

      sb.rpc(
        "get_loyalty_summary"
      ),


      /*
        Reward history.
        RLS ensures users only see their own.
      */

      sb

        .from(
          "loyalty_transactions"
        )

        .select(`
          id,
          type,
          points,
          note,
          created_at,
          expires_at
        `)

        .order(
          "created_at",
          {
            ascending: false
          }
        )

        .limit(50)

    ]);


    if (summary.error) {

      console.error(
        "loyalty summary error:",
        summary.error
      );


      AUS.rewards = {

        points: 0,
        value_jod: 0,
        next_expiry: null,
        next_expiry_points: 0

      };

    }

    else {

      AUS.rewards =
        Array.isArray(summary.data)

          ? summary.data[0]

          : summary.data;

    }


    if (history.error) {

      console.error(
        "loyalty history error:",
        history.error
      );


      AUS.rewardTx = [];

    }

    else {

      AUS.rewardTx =
        history.data || [];

    }


    /*
      Keep the profile balance synchronized
      with the newest DB balance.
    */

    if (
      window.AUTH.profile &&
      AUS.rewards
    ) {

      window.AUTH.profile.loyalty_points =
        Number(
          AUS.rewards.points || 0
        );

    }


    authRender();
  }

};


/* =========================================================
   AUTH EVENTS
========================================================= */

document.addEventListener(
  "auth-changed",
  async () => {

    /*
      When Supabase reports an auth change, refresh the
      profile again so the current role is always correct.
    */

    if (
      window.AUTH &&
      window.AUTH.user
    ) {

      await authRefreshProfile();

    }


    /*
      If the account menu is currently visible,
      redraw it with the newest profile / role.
    */

    if (
      AUS.view === "menu"
    ) {

      authRender();

    }


    authUpdateIcon();
  }
);


/* =========================================================
   ACCOUNT ICON
========================================================= */

function authUpdateIcon() {

  document
    .querySelectorAll(
      ".accounticon"
    )
    .forEach(btn => {

      btn.classList.toggle(
        "logged-in",
        !!window.AUTH.user
      );

    });

}



authUpdateIcon();