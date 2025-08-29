// ==UserScript==
// @name         Fullcast Job to Calendar (Enhanced)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  フルキャストの求人詳細ページから勤務情報を抽出し、カレンダー登録用のURLを生成します。
// @author       Enhanced
// @match        https://fullcast.jp/flinkccpc/sc/ucas1008/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * セレクタ定義 - より具体的なセレクタに変更
     */
    const SELECTORS = {
        // 勤務期間のセレクタを改善
        WORK_PERIOD_ROW: '.job-detail-row:has(.job-detail-term)',
        WORK_PERIOD_VALUE: '.job-detail-row:has(.job-detail-term) div:last-child',
        
        // 勤務時間のセレクタを改善
        WORK_TIME_ROW: '.job-detail-row:has(.job-detail-time)',
        WORK_TIME_VALUE: '.job-detail-row:has(.job-detail-time) div:last-child',
        
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
            
            // job-detail-rowクラスの要素を全て確認
            const jobDetailRows = document.querySelectorAll('.job-detail-row');
            console.log(`job-detail-row要素数: ${jobDetailRows.length}`);
            
            jobDetailRows.forEach((row, index) => {
                console.log(`Row ${index}:`);
                console.log('  HTML:', row.outerHTML.substring(0, 200));
                console.log('  Text:', row.textContent.trim().substring(0, 100));
            });
            
            const checks = [
                { name: '勤務期間行', selector: SELECTORS.WORK_PERIOD_ROW },
                { name: '勤務期間値', selector: SELECTORS.WORK_PERIOD_VALUE },
                { name: '勤務時間行', selector: SELECTORS.WORK_TIME_ROW },
                { name: '勤務時間値', selector: SELECTORS.WORK_TIME_VALUE },
                { name: 'タイトル', selector: SELECTORS.JOB_TITLE },
                { name: '地図URL', selector: SELECTORS.MAP_URL }
            ];

            checks.forEach(({ name, selector }) => {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log(`✅ ${name} が見つかりました`);
                        console.log(`   セレクタ: ${selector}`);
                        console.log(`   内容: ${element.textContent?.trim().substring(0, 100)}...`);
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
         * 勤務期間（日付）を抽出 - 改善版
         */
        static extractEventDate() {
            console.log('=== 勤務期間抽出開始 ===');
            
            try {
                // まず、:has()セレクタを試す
                let dateElement = document.querySelector(SELECTORS.WORK_PERIOD_VALUE);
                
                // :has()が使えない場合の代替方法
                if (!dateElement) {
                    console.log('代替方法で勤務期間を検索...');
                    const jobDetailRows = document.querySelectorAll('.job-detail-row');
                    
                    for (const row of jobDetailRows) {
                        const termElement = row.querySelector('.job-detail-term');
                        if (termElement && termElement.textContent.includes('勤務期間')) {
                            dateElement = row.querySelector('div:last-child');
                            console.log('代替方法で勤務期間要素を発見');
                            break;
                        }
                    }
                }
                
                if (!dateElement) {
                    console.warn('勤務期間要素が見つかりませんでした');
                    return '';
                }

                console.log('勤務期間要素の生テキスト:', dateElement.textContent);
                
                // テキストから日付を抽出
                const fullText = dateElement.textContent.trim();
                
                // 日付パターンを正規表現で抽出 (YYYY/MM/DD形式)
                const datePattern = /(\d{4}\/\d{1,2}\/\d{1,2})/;
                const match = fullText.match(datePattern);
                
                if (match) {
                    const result = match[1];
                    console.log('正規表現で抽出された勤務期間:', result);
                    return result;
                }
                
                // フォールバック: 括弧前までの最初の行を取得
                const lines = fullText.split('\n').filter(line => line.trim());
                const firstLine = lines[0]?.trim().split('(')[0].trim();
                
                if (firstLine && firstLine.includes('/')) {
                    const year = new Date().getFullYear();
                    const result = firstLine.startsWith(year.toString()) ? firstLine : `${year}/${firstLine}`;
                    console.log('フォールバックで抽出された勤務期間:', result);
                    return result;
                }
                
                console.warn('日付の抽出に失敗しました');
                return '';
                
            } catch (error) {
                console.error('勤務期間抽出エラー:', error);
                return '';
            }
        }

        /**
         * 勤務時間を抽出 - 改善版
         */
        static extractWorkTime() {
            console.log('=== 勤務時間抽出開始 ===');
            
            try {
                // まず、:has()セレクタを試す
                let timeElement = document.querySelector(SELECTORS.WORK_TIME_VALUE);
                
                // :has()が使えない場合の代替方法
                if (!timeElement) {
                    console.log('代替方法で勤務時間を検索...');
                    const jobDetailRows = document.querySelectorAll('.job-detail-row');
                    
                    for (const row of jobDetailRows) {
                        const timeLabel = row.querySelector('.job-detail-time');
                        if (timeLabel && timeLabel.textContent.includes('勤務時間')) {
                            timeElement = row.querySelector('div:last-child');
                            console.log('代替方法で勤務時間要素を発見');
                            break;
                        }
                    }
                }
                
                if (!timeElement) {
                    console.warn('勤務時間要素が見つかりませんでした');
                    return { startTime: '', endTime: '' };
                }

                console.log('勤務時間要素の生テキスト:', timeElement.textContent);
                
                // テキストから時間を抽出
                const timeText = timeElement.textContent.trim().replace(/\s+/g, '');
                console.log('整形後の時間テキスト:', timeText);
                
                // 時間パターンを正規表現で抽出 (HH:MM-HH:MM形式)
                const timePattern = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
                const match = timeText.match(timePattern);
                
                if (match) {
                    const result = { 
                        startTime: match[1], 
                        endTime: match[2] 
                    };
                    console.log('正規表現で抽出された勤務時間:', result);
                    return result;
                }
                
                // フォールバック: ハイフンで分割
                const timeParts = timeText.split('-').map(part => part.trim());
                if (timeParts.length >= 2) {
                    const result = {
                        startTime: timeParts[0],
                        endTime: timeParts[1]
                    };
                    console.log('フォールバックで抽出された勤務時間:', result);
                    return result;
                }
                
                console.warn('時間の抽出に失敗しました');
                return { startTime: '', endTime: '' };
                
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
                // 日付の正規化
                const dateParts = date.split('/');
                let year, month, day;
                
                if (dateParts.length === 3) {
                    year = dateParts[0].padStart(4, '2025');
                    month = dateParts[1].padStart(2, '0');
                    day = dateParts[2].padStart(2, '0');
                } else {
                    console.error('日付フォーマットが不正です:', date);
                    return '';
                }
                
                // 時間の正規化
                const timeParts = time.split(':');
                if (timeParts.length !== 2) {
                    console.error('時間フォーマットが不正です:', time);
                    return '';
                }
                
                const hour = timeParts[0].padStart(2, '0');
                const minute = timeParts[1].padStart(2, '0');
                
                const result = `${year}${month}${day}T${hour}${minute}00`;
                console.log(`フォーマット結果: ${date} ${time} -> ${result}`);
                return result;
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

                if (!startDateTime || !endDateTime) {
                    console.error('日時のフォーマットに失敗しました');
                    return '';
                }

                const params = new URLSearchParams({
                    action: 'TEMPLATE',
                    text: title,
                    dates: `${startDateTime}/${endDateTime}`,
                    details: notes || '',
                    location: locationUrl || ''
                });

                const url = `https://www.google.com/calendar/render?${params.toString()}`;
                console.log('生成されたカレンダーURL:', url);
                return url;
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
            console.log('🚀 Fullcast Calendar App (Enhanced Version) を開始します...');
            
            try {
                // 要素チェック
                ElementChecker.checkElements();

                // データ抽出
                const eventData = this.extractAllData();
                console.log('📊 抽出されたデータ:', eventData);

                // 必要なデータが揃っているかチェック
                if (!eventData.eventDate || !eventData.startTime || !eventData.endTime) {
                    console.warn('⚠️ 必要なデータが不足しています。カレンダーURLの生成をスキップします。');
                    return;
                }

                // カレンダーURL生成
                const calendarUrl = CalendarUrlGenerator.generateCalendarUrl(eventData);
                
                if (!calendarUrl) {
                    console.error('❌ カレンダーURLの生成に失敗しました');
                    return;
                }

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
        }, 1500); // 1.5秒待機してから実行（少し長めに設定）
    });

})();
