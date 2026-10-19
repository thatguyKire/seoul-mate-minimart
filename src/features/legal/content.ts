// Privacy policy and terms in three languages (FR-58, FR-59, D-009). Drafts: they need review
// by a lawyer and, for Filipino and Korean, by fluent speakers before launch (PRD S6, S7).
// Plain text only, rendered as React elements, never as HTML (NFR-SEC-10). {address},
// {phone} and {messenger} are filled in from src/config/store.ts.
import type { Locale } from '../i18n/locales';

/** A paragraph, or a bulleted list. */
export type LegalBlock = string | readonly string[];

export interface LegalDocument {
  title: string;
  intro: string;
  sections: readonly { heading: string; blocks: readonly LegalBlock[] }[];
}

/** Shown as "Last updated" on both pages. */
export const legalUpdated = '2026-10-19';

export const legal: Record<Locale, { privacy: LegalDocument; terms: LegalDocument }> = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      intro:
        'This policy explains what personal information the Seoul-Mate Minimart website collects, why, how long we keep it, who else handles it, and your rights under the Data Privacy Act of 2012 (Republic Act No. 10173).',
      sections: [
        {
          heading: 'Who we are',
          blocks: [
            'Seoul-Mate Minimart, {address}, runs this website and decides how the personal information it collects is used. Contact us on Messenger at {messenger} or by phone at {phone}.',
          ],
        },
        {
          heading: 'What we collect',
          blocks: [
            [
              'Visiting the site: the site does not ask who you are. To deliver the pages and the menu, our hosting and database providers record technical details such as your IP address, browser type and the time of your visit in their logs.',
              'Settings you choose: your language, light or dark theme, and your answer on the privacy banner are saved in your browser, so the site remembers them. They stay on your device.',
              'If you accept on the privacy banner: the campaign details in the link you arrived from, such as the name of a Facebook post, are kept in your browser until you close it, and attached to any message you send with the contact form. If we start counting visits, it will happen only after you accept, and this policy will name the service first.',
              'The contact form: your name, a phone number or email address, your message, and the language of the page.',
              'Messenger: when you message our Facebook Page, Meta handles the conversation under its own privacy policy. Our staff read and answer it in the Page inbox.',
              'Error reports: when something on the site breaks, a report goes to Sentry, an error tracking service. Names, email addresses, phone numbers, IP addresses and message text are removed before it is sent.',
            ],
          ],
        },
        {
          heading: 'Why we use it',
          blocks: [
            [
              'To answer your messages and questions about orders.',
              'To keep the site working and secure, and to fix errors.',
              'With your consent, to see which posts and links bring visitors to the site.',
            ],
            'We do not sell your information or use it for advertising.',
          ],
        },
        {
          heading: 'How long we keep it',
          blocks: [
            [
              'Contact form messages: deleted automatically after 180 days.',
              'Campaign details: until you close your browser.',
              'Settings in your browser: until you clear them.',
              'Logs and error reports: for the limited time each provider keeps them.',
            ],
          ],
        },
        {
          heading: 'Who else handles it',
          blocks: [
            'These providers process information for us. Some of them store it outside the Philippines.',
            [
              'Supabase: our database, including the menu and contact form messages.',
              'Meta: Facebook and Messenger.',
              'Sentry: error reports.',
              'Our web host, which serves the site. We will name it here once chosen.',
            ],
          ],
        },
        {
          heading: 'Your rights',
          blocks: [
            'Under the Data Privacy Act you have the right to be informed, to access your personal information, to object to its processing, to have it corrected, to have it erased or blocked, to data portability, and to damages. You can also file a complaint with the National Privacy Commission (privacy.gov.ph).',
            'To use these rights, message us on Messenger or call {phone}.',
          ],
        },
        {
          heading: 'How we protect it',
          blocks: [
            'Only store staff can read contact messages. They log in with a password and can add two-factor login. Information travels over encrypted connections.',
          ],
        },
        {
          heading: 'Changes to this policy',
          blocks: ['When we change this policy, we update the date at the top of this page.'],
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      intro:
        'These terms apply when you use the Seoul-Mate Minimart website and when you order from us through Messenger.',
      sections: [
        {
          heading: 'The menu',
          blocks: [
            'The menu shows what we sell and whether each item is in stock. Staff update it during the day, but an item can sell out between an update and your visit, and prices can change. The price and availability we confirm in Messenger are the ones that apply.',
            'Photos and descriptions are a guide. Packaging and labels can differ from the picture.',
          ],
        },
        {
          heading: 'Ordering',
          blocks: [
            'We do not take orders or payments on this website. To order, message us on Messenger at {messenger}. An order is accepted only when our staff confirm it in the chat.',
          ],
        },
        {
          heading: 'Pickup and payment',
          blocks: [
            'We do not deliver yet. Collect your order at the store, {address}, during opening hours, and pay with cash or GCash when you pick it up. If you can no longer come, please tell us in Messenger.',
          ],
        },
        {
          heading: 'Using the site',
          blocks: [
            'Please do not try to get into the staff panel or the data behind the site, interfere with how it works, or overload it.',
          ],
        },
        {
          heading: 'Liability',
          blocks: [
            'We work to keep the site accurate and available, but we cannot promise it is always free of errors or interruptions. As far as the law allows, we are not responsible for losses that come from relying on information on the site. Nothing in these terms affects your rights as a consumer under Philippine law, including the Consumer Act of the Philippines (Republic Act No. 7394).',
          ],
        },
        {
          heading: 'Governing law',
          blocks: ['These terms are governed by the laws of the Philippines.'],
        },
        {
          heading: 'Changes to these terms',
          blocks: ['When we change these terms, we update the date at the top of this page.'],
        },
        {
          heading: 'Contact',
          blocks: [
            'Questions about these terms: message us on Messenger at {messenger} or call {phone}.',
          ],
        },
      ],
    },
  },

  fil: {
    privacy: {
      title: 'Patakaran sa Privacy',
      intro:
        'Ipinapaliwanag ng patakarang ito kung anong personal na impormasyon ang kinokolekta ng website ng Seoul-Mate Minimart, kung bakit, gaano katagal namin ito iniingatan, sino pa ang humahawak nito, at ang iyong mga karapatan sa ilalim ng Data Privacy Act of 2012 (Republic Act No. 10173).',
      sections: [
        {
          heading: 'Sino kami',
          blocks: [
            'Ang Seoul-Mate Minimart, {address}, ang nagpapatakbo ng website na ito at nagpapasya kung paano gagamitin ang personal na impormasyong kinokolekta nito. Makipag-ugnayan sa amin sa Messenger sa {messenger} o tumawag sa {phone}.',
          ],
        },
        {
          heading: 'Ano ang kinokolekta namin',
          blocks: [
            [
              'Pagbisita sa site: hindi itinatanong ng site kung sino ka. Para maipakita ang mga page at ang menu, itinatala ng aming hosting at database provider sa kanilang mga log ang mga teknikal na detalye gaya ng iyong IP address, uri ng browser at oras ng pagbisita.',
              'Mga setting na pinili mo: ang iyong wika, maliwanag o madilim na tema, at ang sagot mo sa privacy banner ay naka-save sa iyong browser para maalala ito ng site. Nananatili ang mga ito sa iyong device.',
              'Kung tatanggapin mo sa privacy banner: ang mga detalye ng campaign sa link na pinanggalingan mo, gaya ng pangalan ng isang Facebook post, ay iniingatan sa iyong browser hanggang isara mo ito, at idinadagdag sa anumang mensaheng ipapadala mo gamit ang contact form. Kung magsisimula kaming magbilang ng mga bisita, mangyayari lang ito kapag tumanggap ka, at papangalanan muna namin dito ang serbisyong gagamitin.',
              'Ang contact form: ang iyong pangalan, numero ng telepono o email address, ang iyong mensahe, at ang wika ng page.',
              'Messenger: kapag nag-message ka sa aming Facebook Page, ang Meta ang humahawak ng usapan sa ilalim ng sarili nitong patakaran sa privacy. Binabasa at sinasagot ito ng aming staff sa inbox ng Page.',
              'Mga ulat ng error: kapag may nasira sa site, may ulat na ipinapadala sa Sentry, isang serbisyo sa pagsubaybay ng error. Tinatanggal muna ang mga pangalan, email address, numero ng telepono, IP address at laman ng mensahe bago ito ipadala.',
            ],
          ],
        },
        {
          heading: 'Bakit namin ito ginagamit',
          blocks: [
            [
              'Para sagutin ang iyong mga mensahe at tanong tungkol sa order.',
              'Para mapanatiling gumagana at ligtas ang site, at para ayusin ang mga error.',
              'Kung pumayag ka, para makita kung aling mga post at link ang nagdadala ng mga bisita sa site.',
            ],
            'Hindi namin ibinebenta ang iyong impormasyon at hindi namin ito ginagamit sa advertising.',
          ],
        },
        {
          heading: 'Gaano katagal namin ito iniingatan',
          blocks: [
            [
              'Mga mensahe mula sa contact form: awtomatikong binubura pagkalipas ng 180 araw.',
              'Mga detalye ng campaign: hanggang isara mo ang iyong browser.',
              'Mga setting sa iyong browser: hanggang burahin mo ang mga ito.',
              'Mga log at ulat ng error: sa limitadong panahong itinatakda ng bawat provider.',
            ],
          ],
        },
        {
          heading: 'Sino pa ang humahawak nito',
          blocks: [
            'Ang mga provider na ito ang nagpoproseso ng impormasyon para sa amin. Ang ilan sa kanila ay nag-iimbak nito sa labas ng Pilipinas.',
            [
              'Supabase: ang aming database, kasama ang menu at mga mensahe mula sa contact form.',
              'Meta: Facebook at Messenger.',
              'Sentry: mga ulat ng error.',
              'Ang aming web host, na nagsisilbi ng site. Papangalanan namin ito dito kapag napili na.',
            ],
          ],
        },
        {
          heading: 'Ang iyong mga karapatan',
          blocks: [
            'Sa ilalim ng Data Privacy Act, may karapatan kang malaman, ma-access ang iyong personal na impormasyon, tumutol sa pagproseso nito, ipaitama ito, ipabura o ipaharang ito, sa data portability, at sa danyos. Maaari ka ring magsampa ng reklamo sa National Privacy Commission (privacy.gov.ph).',
            'Para gamitin ang mga karapatang ito, mag-message sa amin sa Messenger o tumawag sa {phone}.',
          ],
        },
        {
          heading: 'Paano namin ito pinoprotektahan',
          blocks: [
            'Ang staff lang ng tindahan ang nakakabasa ng mga mensahe mula sa contact form. Nagla-log in sila gamit ang password at maaaring magdagdag ng two-factor login. Dumadaan ang impormasyon sa mga naka-encrypt na koneksyon.',
          ],
        },
        {
          heading: 'Mga pagbabago sa patakarang ito',
          blocks: [
            'Kapag binago namin ang patakarang ito, ina-update namin ang petsa sa itaas ng page na ito.',
          ],
        },
      ],
    },
    terms: {
      title: 'Mga Tuntunin sa Paggamit',
      intro:
        'Ang mga tuntuning ito ay para sa paggamit mo ng website ng Seoul-Mate Minimart at sa pag-order mo sa amin sa Messenger.',
      sections: [
        {
          heading: 'Ang menu',
          blocks: [
            'Ipinapakita ng menu ang aming mga paninda at kung may stock ang bawat item. Ina-update ito ng staff sa buong araw, pero maaaring maubos ang isang item bago pa ang susunod na update, at maaaring magbago ang presyo. Ang presyo at stock na kinumpirma namin sa Messenger ang masusunod.',
            'Gabay lang ang mga litrato at paglalarawan. Maaaring iba ang packaging at label sa nasa larawan.',
          ],
        },
        {
          heading: 'Pag-order',
          blocks: [
            'Hindi kami tumatanggap ng order o bayad sa website na ito. Para umorder, mag-message sa amin sa Messenger sa {messenger}. Tanggap lang ang order kapag kinumpirma na ito ng aming staff sa chat.',
          ],
        },
        {
          heading: 'Pickup at bayad',
          blocks: [
            'Wala pa kaming delivery. Kunin ang iyong order sa tindahan, {address}, sa oras ng tindahan, at magbayad gamit ang cash o GCash pagkuha mo. Kung hindi ka na makakapunta, pakisabi sa amin sa Messenger.',
          ],
        },
        {
          heading: 'Paggamit ng site',
          blocks: [
            'Pakiusap, huwag subukang pasukin ang staff panel o ang data sa likod ng site, guluhin ang paggana nito, o i-overload ito.',
          ],
        },
        {
          heading: 'Pananagutan',
          blocks: [
            "Sinisikap naming panatilihing tama at gumagana ang site, pero hindi namin maipapangako na laging wala itong mali o pagkaantala. Hangga't pinapayagan ng batas, hindi kami mananagot sa pagkalugi dahil sa pag-asa sa impormasyon sa site. Walang anuman sa mga tuntuning ito ang nakakaapekto sa iyong mga karapatan bilang consumer sa ilalim ng batas ng Pilipinas, kasama ang Consumer Act of the Philippines (Republic Act No. 7394).",
          ],
        },
        {
          heading: 'Batas na umiiral',
          blocks: ['Ang mga tuntuning ito ay sakop ng mga batas ng Pilipinas.'],
        },
        {
          heading: 'Mga pagbabago sa mga tuntuning ito',
          blocks: [
            'Kapag binago namin ang mga tuntuning ito, ina-update namin ang petsa sa itaas ng page na ito.',
          ],
        },
        {
          heading: 'Makipag-ugnayan',
          blocks: [
            'May tanong tungkol sa mga tuntuning ito? Mag-message sa amin sa Messenger sa {messenger} o tumawag sa {phone}.',
          ],
        },
      ],
    },
  },

  ko: {
    privacy: {
      title: '개인정보 처리방침',
      intro:
        '이 방침은 Seoul-Mate Minimart 웹사이트가 어떤 개인정보를 왜 수집하는지, 얼마나 보관하는지, 누가 함께 처리하는지, 그리고 필리핀 2012년 데이터 프라이버시법(공화국법 제10173호)에 따른 여러분의 권리를 설명합니다.',
      sections: [
        {
          heading: '운영자',
          blocks: [
            'Seoul-Mate Minimart({address})가 이 웹사이트를 운영하며, 수집한 개인정보의 이용 방법을 결정합니다. 메신저 {messenger} 또는 전화 {phone}로 연락하실 수 있습니다.',
          ],
        },
        {
          heading: '수집하는 정보',
          blocks: [
            [
              '사이트 방문: 사이트는 방문자가 누구인지 묻지 않습니다. 페이지와 메뉴를 제공하기 위해 호스팅 및 데이터베이스 업체가 IP 주소, 브라우저 종류, 방문 시각 같은 기술 정보를 로그에 기록합니다.',
              '선택한 설정: 언어, 밝은 테마 또는 어두운 테마, 개인정보 배너에 대한 답변은 사이트가 기억할 수 있도록 브라우저에 저장됩니다. 이 정보는 기기에만 남습니다.',
              '개인정보 배너에서 동의한 경우: 방문하신 링크에 들어 있는 캠페인 정보(예: 페이스북 게시물 이름)를 브라우저를 닫을 때까지 보관하고, 문의 양식으로 보내는 메시지에 함께 첨부합니다. 방문자 수를 집계하게 되면 동의한 경우에만 진행하며, 먼저 이 방침에 해당 서비스를 밝히겠습니다.',
              '문의 양식: 이름, 전화번호 또는 이메일 주소, 메시지 내용, 페이지 언어.',
              '메신저: 페이스북 페이지로 메시지를 보내면 Meta가 자체 개인정보 처리방침에 따라 대화를 처리합니다. 직원은 페이지 받은편지함에서 메시지를 읽고 답변합니다.',
              '오류 보고: 사이트에 문제가 생기면 오류 추적 서비스인 Sentry로 보고서가 전송됩니다. 전송 전에 이름, 이메일 주소, 전화번호, IP 주소, 메시지 내용은 삭제됩니다.',
            ],
          ],
        },
        {
          heading: '이용 목적',
          blocks: [
            [
              '메시지와 주문 문의에 답변하기 위해.',
              '사이트를 안전하고 정상적으로 운영하고 오류를 고치기 위해.',
              '동의한 경우, 어떤 게시물과 링크로 방문자가 오는지 확인하기 위해.',
            ],
            '개인정보를 판매하거나 광고에 이용하지 않습니다.',
          ],
        },
        {
          heading: '보관 기간',
          blocks: [
            [
              '문의 양식 메시지: 180일 후 자동으로 삭제됩니다.',
              '캠페인 정보: 브라우저를 닫을 때까지.',
              '브라우저에 저장된 설정: 직접 삭제할 때까지.',
              '로그와 오류 보고: 각 업체가 정한 제한된 기간 동안.',
            ],
          ],
        },
        {
          heading: '정보를 함께 처리하는 업체',
          blocks: [
            '다음 업체가 저희를 대신해 정보를 처리합니다. 일부는 필리핀 밖에 정보를 저장합니다.',
            [
              'Supabase: 메뉴와 문의 양식 메시지를 포함한 데이터베이스.',
              'Meta: 페이스북과 메신저.',
              'Sentry: 오류 보고.',
              '사이트를 제공하는 웹 호스팅 업체. 선정되면 여기에 밝히겠습니다.',
            ],
          ],
        },
        {
          heading: '여러분의 권리',
          blocks: [
            '데이터 프라이버시법에 따라 여러분은 정보를 제공받을 권리, 개인정보에 접근할 권리, 처리에 반대할 권리, 정정을 요구할 권리, 삭제 또는 차단을 요구할 권리, 데이터 이동권, 손해배상을 받을 권리가 있습니다. 필리핀 국가개인정보위원회(National Privacy Commission, privacy.gov.ph)에 민원을 제기할 수도 있습니다.',
            '이 권리를 행사하려면 메신저로 메시지를 보내거나 {phone}로 전화해 주세요.',
          ],
        },
        {
          heading: '정보 보호',
          blocks: [
            '문의 메시지는 매장 직원만 읽을 수 있습니다. 직원은 비밀번호로 로그인하며 2단계 로그인을 추가할 수 있습니다. 정보는 암호화된 연결로 전송됩니다.',
          ],
        },
        {
          heading: '방침 변경',
          blocks: ['이 방침을 변경하면 이 페이지 상단의 날짜를 갱신합니다.'],
        },
      ],
    },
    terms: {
      title: '이용약관',
      intro: '이 약관은 Seoul-Mate Minimart 웹사이트를 이용하거나 메신저로 주문할 때 적용됩니다.',
      sections: [
        {
          heading: '메뉴',
          blocks: [
            '메뉴에는 판매 상품과 상품별 재고 여부가 표시됩니다. 직원이 하루 동안 수시로 갱신하지만, 갱신 사이에 품절될 수 있고 가격이 바뀔 수 있습니다. 메신저에서 확인해 드린 가격과 재고가 적용됩니다.',
            '사진과 설명은 참고용입니다. 포장과 라벨은 사진과 다를 수 있습니다.',
          ],
        },
        {
          heading: '주문',
          blocks: [
            '이 웹사이트에서는 주문이나 결제를 받지 않습니다. 주문하시려면 메신저 {messenger}로 메시지를 보내 주세요. 직원이 채팅에서 확인해 드려야 주문이 접수됩니다.',
          ],
        },
        {
          heading: '수령과 결제',
          blocks: [
            '아직 배달은 하지 않습니다. 영업시간에 매장({address})에서 주문하신 상품을 받아 가시고, 받으실 때 현금이나 GCash로 결제해 주세요. 오시기 어려워지면 메신저로 알려 주세요.',
          ],
        },
        {
          heading: '사이트 이용',
          blocks: [
            '직원용 관리 화면이나 사이트 데이터에 무단으로 접근하거나, 사이트 작동을 방해하거나, 과부하를 일으키지 말아 주세요.',
          ],
        },
        {
          heading: '책임의 제한',
          blocks: [
            '사이트를 정확하고 원활하게 운영하려고 노력하지만, 오류나 중단이 전혀 없다고 보장할 수는 없습니다. 법이 허용하는 범위에서, 사이트 정보를 믿고 발생한 손해에 대해 책임지지 않습니다. 이 약관은 필리핀 소비자법(공화국법 제7394호)을 포함한 필리핀 법에 따른 소비자의 권리에 영향을 주지 않습니다.',
          ],
        },
        {
          heading: '준거법',
          blocks: ['이 약관에는 필리핀 법이 적용됩니다.'],
        },
        {
          heading: '약관 변경',
          blocks: ['이 약관을 변경하면 이 페이지 상단의 날짜를 갱신합니다.'],
        },
        {
          heading: '문의',
          blocks: ['약관에 관한 문의는 메신저 {messenger} 또는 전화 {phone}로 해 주세요.'],
        },
      ],
    },
  },
};
