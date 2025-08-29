// ==UserScript==
// @name         Fullcast Job to Calendar (Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  フルキャストの求人詳細ページから勤務情報を抽出し、カレンダー登録用のURLを生成します。
// @author       Refactored
// @match        https://fullcast.jp/flinkccpc/sc/ucas1008/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * セレクタ定義 - :contains()セレクタを一切使用しない
     */
    const SELECTORS = {
        WORK_PERIOD: '.recruit-detail-box .job-detail-row:has(.job-detail-term) div',
        WORK_TIME: '.recruit-detail-box .job-detail-row:has(.job-detail-time) div',
        JOB_TITLE: '.job-title.mt-2',
        MAP_URL: '.recruit-detail-box .job-traffic-info-box a.map',
        TABLE_HEADERS: '.recruit-detail-box th',
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
            console.log('=== 要素存在チェック開始 ===');
            
            const checks = [
                { name: '勤務期間', selector: SELECTORS.WORK_PERIOD },
                { name: '勤務時間', selector: SELECTORS.WORK_TIME },
                { name: 'タイトル', selector: SELECTORS.JOB_TITLE },
                { name: '地図URL', selector: SELECTORS.MAP_URL },
                { name: 'テーブルヘッダー', selector: SELECTORS.TABLE_HEADERS }
            ];

            checks.forEach(({ name, selector }) => {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log(`✅ ${name} が見つかりました`);
                        console.log(`   セレクタ: ${selector}`);
                        console.log(`   内容: ${element.textContent?.trim().substring(0, 50)}...`);
                    } else {
                        console.warn(`⚠️ ${name} が見つかりませんでした`);
                        console.log(`   セレクタ: ${selector}`);
                    }
                } catch (error) {
                    console.error(`❌ ${name} のセレクタエラー:`, error);
                    console.log(`   セレクタ: ${selector}`);
                }
            });
            
            console.log('=== 要素存在チェック終了 ===');
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
            try {
                const dateElement = document.querySelector(SELECTORS.WORK_PERIOD);
                if (!dateElement) {
                    console.warn('勤務期間要素が見つかりませんでした');
                    return '';
                }

                const dateText = dateElement.textContent.trim().split('(')[0];
                const year = new Date().getFullYear();
                const result = dateText ? `${year}/${dateText.replace(/ /g, '')}` : '';
                console.log('抽出された勤務期間:', result);
                return result;
            } catch (error) {
                console.error('勤務期間抽出エラー:', error);
                return '';
            }
        }

        /**
         * 勤務時間を抽出
         */
        static extractWorkTime() {
            try {
                const timeElement = document.querySelector(SELECTORS.WORK_TIME);
                if (!timeElement) {
                    console.warn('勤務時間要素が見つかりませんでした');
                    return { startTime: '', endTime: '' };
                }

                const timeText = timeElement.textContent.trim().replace(/\s/g, '');
                const [startTime = '', endTime = ''] = timeText.split('-');
                
                const result = { startTime, endTime };
                console.log('抽出された勤務時間:', result);
                return result;
            } catch (error) {
                console.error('勤務時間抽出エラー:', error);
                return { startTime: '', endTime: '' };
            }
        }

        /**
         * 求人タイトルを抽出
         */
        static extractJobTitle() {
            try {
                const jobTitleElement = document.querySelector(SELECTORS.JOB_TITLE);
                const result = jobTitleElement ? 
                    jobTitleElement.textContent.trim() : 
                    'フルキャストのお仕事';
                console.log('抽出されたタイトル:', result);
                return result;
            } catch (error) {
                console.error('タイトル抽出エラー:', error);
                return 'フルキャストのお仕事';
            }
        }

        /**
         * 地図URLを抽出
         */
        static extractLocationUrl() {
            try {
                const mapLinkElement = document.querySelector(SELECTORS.MAP_URL);
                const result = mapLinkElement ? mapLinkElement.href : '';
                console.log('抽出された地図URL:', result);
                return result;
            } catch (error) {
                console.error('地図URL抽出エラー:', error);
                return '';
            }
        }

        /**
         * 備考（持ち物・服装）を抽出
         */
        static extractNotes() {
            try {
                // 持ち物を検索
                const belongings = this.findTableCellByHeader('持ち物');
                // 服装を検索
                const clothing = this.findTableCellByHeader('服装');
                
                const belongingsText = belongings ? 
                    `持ち物: ${belongings.textContent.trim()}` : '';
                const clothingText = clothing ? 
                    `服装: ${clothing.textContent.trim()}` : '';
                
                const result = [belongingsText, clothingText].filter(Boolean).join('\n');
                console.log('抽出された備考:', result);
                return result;
            } catch (error) {
                console.error('備考抽出エラー:', error);
                return '';
            }
        }

        /**
         * テーブルヘッダーのテキストで対応するセルを検索
         */
        static findTableCellByHeader(headerText) {
            try {
                const thElements = document.querySelectorAll(SELECTORS.TABLE_HEADERS);
                console.log(`${headerText}を検索中... テーブルヘッダー数: ${thElements.length}`);
                
                for (const th of thElements) {
                    const thText = th.textContent.trim();
                    console.log(`ヘッダーテキスト: "${thText}"`);
                    
                    if (thText.includes(headerText)) {
                        console.log(`✅ ${headerText}のヘッダーを発見`);
                        const nextCell = th.nextElementSibling;
                        if (nextCell) {
                            console.log(`✅ 対応するセルを発見: ${nextCell.textContent.trim()}`);
                        }
                        return nextCell;
                    }
                }
                
                console.warn(`❌ ${headerText}のヘッダーが見つかりませんでした`);
                return null;
            } catch (error) {
                console.error(`テーブルセル検索エラー (${headerText}):`, error);
                return null;
            }
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
            
            try {
                const [year, month, day] = date.split('/').map(s => s.padStart(2, '0'));
                const [hour, minute] = time.split(':').map(s => s.padStart(2, '0'));
                
                return `${year}${month}${day}T${hour}${minute}00`;
            } catch (error) {
                console.error('日時フォーマットエラー:', error);
                return '';
            }
        }

        /**
         * Googleカレンダー登録URLを生成
         */
        static generateCalendarUrl(eventData) {
            try {
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
            } catch (error) {
                console.error('カレンダーURL生成エラー:', error);
                return '';
            }
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
            try {
                const container = document.querySelector(SELECTORS.CONTAINER);
                if (container) {
                    container.prepend(button);
                    console.log('✅ カレンダー登録ボタンが追加されました。');
                } else {
                    console.error('❌ ボタン配置用のコンテナが見つかりませんでした。');
                }
            } catch (error) {
                console.error('ボタン追加エラー:', error);
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
            console.log('🚀 Fullcast Calendar App (Fixed Version) を開始します...');
            
            try {
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
                
                console.log('✅ アプリケーション実行完了');
            } catch (error) {
                console.error('❌ アプリケーション実行エラー:', error);
            }
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
        setTimeout(() => {
            FullcastCalendarApp.run();
        }, 1000); // 1秒待機してから実行
    });

})();
