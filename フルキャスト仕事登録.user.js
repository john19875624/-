// ==UserScript==
// @name         Fullcast Job to Calendar
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  フルキャストの求人詳細ページから勤務情報を抽出し、カレンダー登録用のURLを生成します。
// @author       Refactored
// @match        https://fullcast.jp/flinkccpc/sc/ucas1008/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * セレクタ定義
     */
    const SELECTORS = {
        WORK_PERIOD: '.job-detail-row:has(.job-detail-term) div',
        WORK_TIME: '.job-detail-row:has(.job-detail-time) div',
        JOB_TITLE: '.job-title.mt-2',
        MAP_URL: '.job-traffic-info-box a.map',
        BELONGINGS: 'th:contains("持ち物") + td',
        CLOTHING: 'th:contains("服装") + td',
        CONTAINER: '.recruit-detail-box'
    };

    /**
     * ボタンスタイル定義
     */
    const BUTTON_STYLES = {
        display: 'block',
        width: '250px',
        margin: '20px auto',
        padding: '10px',
        textAlign: 'center',
        color: '#fff',
        backgroundColor: '#4285F4',
        borderRadius: '5px',
        textDecoration: 'none',
        fontWeight: 'bold'
    };

    /**
     * 要素の存在チェックとデバッグ出力
     */
    class ElementChecker {
        static checkElements() {
            const checks = [
                { name: '勤務期間', selector: SELECTORS.WORK_PERIOD },
                { name: '勤務時間', selector: SELECTORS.WORK_TIME },
                { name: 'タイトル', selector: SELECTORS.JOB_TITLE },
                { name: '地図URL', selector: SELECTORS.MAP_URL },
                { name: '持ち物', selector: SELECTORS.BELONGINGS },
                { name: '服装', selector: SELECTORS.CLOTHING }
            ];

            checks.forEach(({ name, selector }) => {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`✅ ${name} (${selector}) が正常に読み込めました。`);
                } else {
                    console.error(`❌ ${name} (${selector}) が見つかりませんでした。`);
                }
            });
        }
    }

    /**
     * データ抽出クラス
     */
    class DataExtractor {
        /**
         * 勤務期間（日付）を抽出
         */
        static extractEventDate() {
            const dateElement = document.querySelector(SELECTORS.WORK_PERIOD);
            if (!dateElement) return '';

            const dateText = dateElement.textContent.trim().split('(')[0];
            const year = new Date().getFullYear();
            return dateText ? `${year}/${dateText.replace(/ /g, '')}` : '';
        }

        /**
         * 勤務時間を抽出
         */
        static extractWorkTime() {
            const timeElement = document.querySelector(SELECTORS.WORK_TIME);
            if (!timeElement) return { startTime: '', endTime: '' };

            const timeText = timeElement.textContent.trim().replace(/\s/g, '');
            const [startTime = '', endTime = ''] = timeText.split('-');
            
            return { startTime, endTime };
        }

        /**
         * 求人タイトルを抽出
         */
        static extractJobTitle() {
            const jobTitleElement = document.querySelector(SELECTORS.JOB_TITLE);
            return jobTitleElement ? 
                jobTitleElement.textContent.trim() : 
                'フルキャストのお仕事';
        }

        /**
         * 地図URLを抽出
         */
        static extractLocationUrl() {
            const mapLinkElement = document.querySelector(SELECTORS.MAP_URL);
            return mapLinkElement ? mapLinkElement.href : '';
        }

        /**
         * 備考（持ち物・服装）を抽出
         */
        static extractNotes() {
            const belongingsElement = document.querySelector(SELECTORS.BELONGINGS);
            const clothingElement = document.querySelector(SELECTORS.CLOTHING);
            
            const belongings = belongingsElement ? 
                `持ち物: ${belongingsElement.textContent.trim()}` : '';
            const clothing = clothingElement ? 
                `服装: ${clothingElement.textContent.trim()}` : '';
            
            return [belongings, clothing].filter(Boolean).join('\n');
        }
    }

    /**
     * カレンダーURL生成クラス
     */
    class CalendarUrlGenerator {
        /**
         * 日付と時間をGoogleカレンダー形式にフォーマット
         */
        static formatDateTime(date, time) {
            if (!date || !time) return '';
            
            const [year, month, day] = date.split('/').map(s => s.padStart(2, '0'));
            const [hour, minute] = time.split(':').map(s => s.padStart(2, '0'));
            
            return `${year}${month}${day}T${hour}${minute}00`;
        }

        /**
         * Googleカレンダー登録URLを生成
         */
        static generateCalendarUrl(eventData) {
            const { title, eventDate, startTime, endTime, notes, locationUrl } = eventData;
            
            const startDateTime = this.formatDateTime(eventDate, startTime);
            const endDateTime = this.formatDateTime(eventDate, endTime);

            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: title,
                dates: `${startDateTime}/${endDateTime}`,
                details: notes,
                location: locationUrl
            });

            return `https://www.google.com/calendar/render?${params.toString()}`;
        }
    }

    /**
     * UI操作クラス
     */
    class UIManager {
        /**
         * カレンダー登録ボタンを作成
         */
        static createCalendarButton(calendarUrl) {
            const button = document.createElement('a');
            button.href = calendarUrl;
            button.target = '_blank';
            button.textContent = 'Googleカレンダーに登録';
            
            // スタイル適用
            Object.assign(button.style, BUTTON_STYLES);
            
            return button;
        }

        /**
         * ボタンをページに追加
         */
        static addButtonToPage(button) {
            const container = document.querySelector(SELECTORS.CONTAINER);
            if (container) {
                container.prepend(button);
                console.log('✅ カレンダー登録ボタンが追加されました。');
            } else {
                console.error('❌ ボタン配置用のコンテナが見つかりませんでした。');
            }
        }
    }

    /**
     * メインアプリケーションクラス
     */
    class FullcastCalendarApp {
        /**
         * アプリケーション実行
         */
        static run() {
            console.log('🚀 Fullcast Calendar App を開始します...');
            
            // 要素チェック
            ElementChecker.checkElements();

            // データ抽出
            const eventData = this.extractAllData();
            console.log('📊 抽出されたデータ:', eventData);

            // カレンダーURL生成
            const calendarUrl = CalendarUrlGenerator.generateCalendarUrl(eventData);
            console.log('📅 生成されたカレンダーURL:', calendarUrl);

            // UIにボタン追加
            const button = UIManager.createCalendarButton(calendarUrl);
            UIManager.addButtonToPage(button);
        }

        /**
         * 全データを抽出
         */
        static extractAllData() {
            const eventDate = DataExtractor.extractEventDate();
            const { startTime, endTime } = DataExtractor.extractWorkTime();
            const title = DataExtractor.extractJobTitle();
            const locationUrl = DataExtractor.extractLocationUrl();
            const notes = DataExtractor.extractNotes();

            return {
                title,
                eventDate,
                startTime,
                endTime,
                notes,
                locationUrl
            };
        }
    }

    // ページロード完了後にアプリケーション実行
    window.addEventListener('load', () => {
        FullcastCalendarApp.run();
    });

})();
