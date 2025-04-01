import * as pako from 'https://cdn.jsdelivr.net/npm/pako@2.0.4/+esm';

let acupointConfig = {};
let meridianMap = {};
let meridianLinkConfig = {};

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
            }),
        fetch('data/MeridianLinkConfig.json.gz')
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
                meridianLinkConfig = data['玄络'];
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
                document.getElementById('meridianLinkTabs').classList.add('d-none'); // Hide tabs
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

        // 新增“展示玄络”按钮
        const dropdownButton = document.getElementById('mindItemDropdown');
        const showMeridianLinkButton = document.createElement('button');
        showMeridianLinkButton.className = 'btn btn-secondary ms-2';
        showMeridianLinkButton.textContent = '展示玄络';
        showMeridianLinkButton.addEventListener('click', () => {
            meridianMapContainer.innerHTML = ''; // Clear previous content
            document.getElementById('meridianLinkTabs').classList.remove('d-none'); // Show tabs
            const meridianLinkElement = createMeridianLinkElement();
            document.getElementById('zhengji').innerHTML = meridianLinkElement['正基'];
            document.getElementById('zhongdan').innerHTML = meridianLinkElement['中丹'];
            document.getElementById('tongyuan').innerHTML = meridianLinkElement['通元'];
        });
        dropdownButton.parentNode.insertBefore(showMeridianLinkButton, dropdownButton.nextSibling);
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
            const grooveElement = document.createElement('div');
            grooveElement.className = 'meridian-link'; // 添加新的样式类

            const grooveInfo = acupointConfig[groove];
            if (grooveInfo) {
                const grooveNameElement = document.createElement('h6');
                grooveNameElement.textContent = `窍关${i}: ${grooveInfo.name}`;
                grooveElement.appendChild(grooveNameElement);

                const grooveTypeElement = document.createElement('p');
                grooveTypeElement.textContent = `类型: ${grooveInfo.type === 1 ? '参伐' : grooveInfo.type === 2 ? '守御' : '共贯'}`;
                grooveElement.appendChild(grooveTypeElement);

                const grooveClassElement = document.createElement('p');
                grooveClassElement.textContent = `等级: ${grooveInfo.class === 1 ? '正基' : grooveInfo.class === 2 ? '中丹' : '通玄'}`;
                grooveElement.appendChild(grooveClassElement);

                const grooveResourceElement = document.createElement('p');
                grooveResourceElement.textContent = `资源: ${grooveInfo.resource.length > 0 ? grooveInfo.resource.map(resource => `${getResourceName(resource[0])}: ${resource[1]}`).join(', ') : '无'}`;
                grooveElement.appendChild(grooveResourceElement);

                const grooveTimeElement = document.createElement('p');
                grooveTimeElement.textContent = `冲脉时间: ${formatTime(grooveInfo.time)}`;
                grooveElement.appendChild(grooveTimeElement);
            } else {
                const grooveNameElement = document.createElement('h6');
                grooveNameElement.textContent = `窍关${i}: ${groove}`;
                grooveElement.appendChild(grooveNameElement);
            }

            if (precondition.length > 0) {
                const preconditionElement = document.createElement('p');
                preconditionElement.textContent = `前置条件: ${precondition.join(', ')}`;
                grooveElement.appendChild(preconditionElement);
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

function createMeridianLinkElement() {
    const categories = {
        '正基': [],
        '中丹': [],
        '通元': []
    };

    Object.values(meridianLinkConfig).forEach(link => {
        const category = link.class === 1 ? '正基' : link.class === 2 ? '中丹' : '通元';
        categories[category].push(link);
    });

    const result = {
        '正基': '',
        '中丹': '',
        '通元': ''
    };

    Object.keys(categories).forEach(category => {
        categories[category].forEach(link => {
            const linkElement = document.createElement('div');
            linkElement.className = 'meridian-link'; // 添加新的样式类

            const nameElement = document.createElement('h6');
            nameElement.textContent = `名称: ${link.name}`;
            linkElement.appendChild(nameElement);

            const unlockTextElement = document.createElement('p');
            unlockTextElement.textContent = `解锁条件: ${link.Unlocktext}`;
            linkElement.appendChild(unlockTextElement);

            const resourceElement = document.createElement('p');
            resourceElement.textContent = `资源: ${link.resource.length > 0 ? link.resource.map(resource => `${getResourceName(resource[0])}: ${resource[1]}`).join(', ') : '无'}`;
            linkElement.appendChild(resourceElement);

            const propertyElement = document.createElement('p');
            propertyElement.textContent = `属性加成: ${link.property.map(prop => `${getElementName(prop[2])}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}`;
            linkElement.appendChild(propertyElement);

            const specialTextElement = document.createElement('p');
            specialTextElement.textContent = `特殊效果: ${link.specialtext}`;
            linkElement.appendChild(specialTextElement);

            const specialUnlockTextElement = document.createElement('p');
            specialUnlockTextElement.textContent = `特殊效果解锁条件: ${link.SUnlocktext||""}`;
            linkElement.appendChild(specialUnlockTextElement);

            result[category] += linkElement.outerHTML;
        });
    });

    return result;
}
