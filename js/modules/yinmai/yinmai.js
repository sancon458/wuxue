import * as pako from 'https://cdn.jsdelivr.net/npm/pako@2.0.4/+esm';

let acupointConfig = {};
let meridianMap = {};

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetch('data/MeridianMapConfig.json.gz')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(gzippedData => {
                const data = pako.inflate(gzippedData, { to: 'string' });
                return JSON.parse(data);
            })
            .then(data => {
                meridianMap = data['玄脉图'];
            }),
        fetch('data/AcupointConfig.json.gz')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(gzippedData => {
                const data = pako.inflate(gzippedData, { to: 'string' });
                return JSON.parse(data);
            })
            .then(data => {
                acupointConfig = data['玄脉图'];
            })
    ])
    .then(() => {
        const meridianMapContainer = document.getElementById('meridianMap');
        meridianMapContainer.innerHTML = ''; // Clear loading spinner
        const sortedKeys = Object.keys(meridianMap).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0], 10);
            const numB = parseInt(b.match(/\d+/)[0], 10);
            return numA - numB;
        });

        // Populate dropdown menu
        const dropdownMenu = document.getElementById('mindItemDropdownMenu');
        sortedKeys.forEach(mindItemKey => {
            const dropdownItem = document.createElement('li');
            const dropdownLink = document.createElement('a');
            dropdownLink.className = 'dropdown-item';
            dropdownLink.href = '#';
            dropdownLink.textContent = `玄络图${mindItemKey.match(/\d+/)[0]}`;
            dropdownLink.dataset.mindItemKey = mindItemKey;
            dropdownItem.appendChild(dropdownLink);
            dropdownMenu.appendChild(dropdownItem);
        });

        // Add event listener to dropdown items
        dropdownMenu.addEventListener('click', (event) => {
            if (event.target && event.target.matches('a.dropdown-item')) {
                const mindItemKey = event.target.dataset.mindItemKey;
                const mindItem = meridianMap[mindItemKey];
                meridianMapContainer.innerHTML = ''; // Clear previous content
                const mindItemElement = createMindItemElement(mindItem, mindItemKey);
                meridianMapContainer.appendChild(mindItemElement);
            }
        });

        // Display the first mind item by default
        if (sortedKeys.length > 0) {
            const firstMindItemKey = sortedKeys[0];
            const firstMindItem = meridianMap[firstMindItemKey];
            const firstMindItemElement = createMindItemElement(firstMindItem, firstMindItemKey);
            meridianMapContainer.appendChild(firstMindItemElement);
        }
    })
    .catch(error => console.error('Error loading JSON files:', error));
});

function createMindItemElement(mindItem, mindItemKey) {
    const mindItemElement = document.createElement('div');
    mindItemElement.className = 'col-md-12 mb-3';

    // Extract the number from mindItemKey to display as 玄络图X
    const idNumber = mindItemKey.match(/\d+/)[0];
    const nameElement = document.createElement('h5');
    nameElement.textContent = `玄络图${idNumber} - ${mindItem.name}`;
    mindItemElement.appendChild(nameElement);

    const resourceElement = document.createElement('p');
    mindItem.resource.forEach(resource => {
        const resourceName = getResourceName(resource[0]);
        const resourceAmount = resource[1];
        resourceElement.textContent += `需要${resourceName}: ${resourceAmount} `;
    });
    mindItemElement.appendChild(resourceElement);

    const timeElement = document.createElement('p');
    timeElement.textContent = `破境时间: ${formatTime(mindItem.time)}`;
    mindItemElement.appendChild(timeElement);

    for (let i = 1; i <= 14; i++) {
        const groove = mindItem[`groove${i}`];
        const precondition = mindItem[`precondition${i}`];
        if (groove) {
            const grooveElement = document.createElement('p');
            const grooveInfo = acupointConfig[groove];
            if (grooveInfo) {
                grooveElement.textContent = `窍关${i}: ${grooveInfo.name}`;
                grooveElement.textContent += ` (类型: ${grooveInfo.type === 1 ? '参伐' : grooveInfo.type === 2 ? '守御' : '共贯'})`;
                grooveElement.textContent += ` (等级: ${grooveInfo.class === 1 ? '正基' : grooveInfo.type === 2 ? '中丹' : '通玄'})`;
                grooveElement.textContent += ` (资源: ${grooveInfo.resource.length > 0 ? grooveInfo.resource.map(resource => `${getResourceName(resource[0])}: ${resource[1]}`).join(', ') : '无'})`;
                grooveElement.textContent += ` (冲脉时间: ${formatTime(grooveInfo.time)})`;
            } else {
                grooveElement.textContent = `窍关${i}: ${groove}`;
            }
            console.log(grooveInfo);
            if (precondition.length > 0) {
                grooveElement.textContent += ` (前置条件: ${precondition.join(', ')})`;
            }
            mindItemElement.appendChild(grooveElement);
        }
    }

    return mindItemElement;
}

function getResourceName(resourceKey) {
    const currency = {
        money: "碎银",
        gold: "黄金",
        yuanbao: "元宝",
        meiyu: "江湖美誉",
        deadCurrency: "亿冥币",
        mingbi: "亿冥币",
        zjjifen: "功绩",
        yinpiao: "银票",
        spcl: "饰品材料",
        jiaozi: "游字令",
        zhounianjf: "七夕礼券",
        dreamYiYu: "梦内呓语",
        xiangnang: "香囊",
        zongheng: "雪矾",
        molizhu: "墨璃珠",
        amartial: "武学要领",
        dmartial: "功法学识",
        bmartial: "武学心得",
        cmartial: "武学至极",
        xizhaoling: "昔朝令",
    };
    return currency[resourceKey] || resourceKey;
}

function getElementName(elementId) {
    const methodNames = {
        "1": "无性",
        "3": "阳性",
        "5": "阴性",
        "7": "混元",
        "9": "外功",
    };
    return methodNames[elementId] || elementId;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return `${hours}小时${minutes}分钟${seconds}秒`;
}