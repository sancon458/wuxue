import * as pako from '../../../extern/pako_2.0.4_esm.js';

let acupointConfig = {};
let meridianMap = {};
let meridianLinkConfig = {};

// 手动初始化Bootstrap的下拉组件
document.addEventListener('DOMContentLoaded', function () {
    var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'))
    dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl)
    })
});

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

    // 标题和基础信息部分（保持原样）
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

    // 总属性容器（保持原样）
    const totalAttributeContainer = document.createElement('div');
    totalAttributeContainer.className = 'total-attributes mb-3';
    totalAttributeContainer.innerHTML = '<h6>总属性</h6>';
    mindItemElement.appendChild(totalAttributeContainer);

    // 创建九宫格容器
    const gridContainer = document.createElement('div');
    gridContainer.className = 'meridian-grid'; // 通过CSS定义网格布局
    mindItemElement.appendChild(gridContainer);

    // 生成网格项
    for (let i = 1; i <= 14; i++) {
        const groove = mindItem[`groove${i}`];
        const precondition = mindItem[`precondition${i}`];
        if (!groove) continue;

        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';

        // 添加序号标识
        const orderBadge = document.createElement('span');
        orderBadge.className = 'grid-order-badge';
        orderBadge.textContent = i;
        gridItem.appendChild(orderBadge);

        // 内容部分（保持原有逻辑）
        const grooveInfo = acupointConfig[groove];
        if (grooveInfo) {
            const grooveNameElement = document.createElement('h6');
            grooveNameElement.textContent = `窍关${i}: ${grooveInfo.name}`;
            gridItem.appendChild(grooveNameElement);

            // 类型标签
            const typeTag = document.createElement('span');
            typeTag.className = `badge ${getTypeClass(grooveInfo.type)}`;
            typeTag.textContent = grooveInfo.type === 1 ? '参伐' : grooveInfo.type === 2 ? '守御' : '共贯';
            gridItem.appendChild(typeTag);

            // 等级标签
            const classTag = document.createElement('span');
            classTag.className = `badge ${getClassClass(grooveInfo.class)}`;
            classTag.textContent = grooveInfo.class === 1 ? '正基' : grooveInfo.class === 2 ? '中丹' : '通元';
            gridItem.appendChild(classTag);

            // 资源信息
            const resourceWrapper = document.createElement('div');
            resourceWrapper.className = 'resource-wrapper';
            grooveInfo.resource.forEach(resource => {
                const resourceItem = document.createElement('span');
                resourceItem.className = 'resource-item';
                resourceItem.innerHTML = `<i class="bi-coin"></i>${getResourceName(resource[0])}×${resource[1]}`;
                resourceWrapper.appendChild(resourceItem);
            });
            gridItem.appendChild(resourceWrapper);

            // 时间信息
            const timeWrapper = document.createElement('div');
            timeWrapper.className = 'time-wrapper';
            timeWrapper.innerHTML = `<i class="bi-clock-history"></i>${formatTime(grooveInfo.time)}`;
            gridItem.appendChild(timeWrapper);

            // 前置条件（直接展示）
            if (precondition.length > 0) {
                const preconditionWrapper = document.createElement('div');
                preconditionWrapper.className = 'precondition-wrapper mt-2';
                
                const title = document.createElement('div');
                title.className = 'precondition-title text-muted small';
                title.textContent = '前置要求：';
                preconditionWrapper.appendChild(title);

                const content = document.createElement('div');
                content.className = 'precondition-content';
                content.innerHTML = precondition.map(p => `
                    <span class="precondition-item badge bg-light text-dark border me-1">${p}</span>
                `).join('');
                preconditionWrapper.appendChild(content);

                gridItem.appendChild(preconditionWrapper);
            }

            // 在 createMindItemElement 的按钮部分修改如下
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'button-wrapper d-flex justify-content-between align-items-center';

            // 装备按钮
            const installButton = document.createElement('button');
            installButton.className = 'btn btn-primary btn-sm';
            installButton.innerHTML = '<i class="bi-magic"></i> 装备玄络';
            installButton.addEventListener('click', () => {
                const modal = createMeridianLinkModal(grooveInfo.type, grooveInfo.class, gridItem);
                document.body.appendChild(modal);
            });

            // 卸下按钮
            const uninstallButton = document.createElement('button');
            uninstallButton.className = 'btn btn-outline-danger btn-sm';
            uninstallButton.innerHTML = '<i class="bi-trash"></i> 卸下';
            // uninstallButton.style.display = 'none'; // 初始隐藏
            uninstallButton.addEventListener('click', () => {
                // 删除属性元素
                gridItem.querySelectorAll('.highlight-property, .highlight-special').forEach(el => el.remove());
                
                // 清空总属性
                const totalContainer = gridItem.closest('.col-md-12').querySelector('.total-attributes');
                totalContainer.innerHTML = '<h6>总属性</h6>';

            });

            buttonWrapper.appendChild(installButton);
            buttonWrapper.appendChild(uninstallButton);
            gridItem.appendChild(buttonWrapper);

        }

        gridContainer.appendChild(gridItem);
    }

    return mindItemElement;
}

// 新增样式辅助函数
function getTypeClass(type) {
    return {
        1: 'bg-danger',
        2: 'bg-primary',
        3: 'bg-success'
    }[type] || 'bg-secondary';
}

function getClassClass(linkClass) {
    return {
        1: 'bg-warning text-dark',
        2: 'bg-info text-dark',
        3: 'bg-dark'
    }[linkClass] || 'bg-secondary';
}

// 修改 createMeridianLinkModal 函数以更新总属性
function createMeridianLinkModal(xltype, xlclass, grooveElement) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.tabIndex = '-1';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">选择玄络</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <ul class="list-group">
                        ${Object.values(meridianLinkConfig)
                            .filter(link => link.type === xltype && link.class === xlclass)
                            .map(link => `
                                <li class="list-group-item">
                                    <strong>${link.name}</strong>
                                    <p>属性加成: ${link.property.map(prop => `${getElementName(prop[2])}${getElementName(prop[1]) == 'defDamageClass' ? '防御' : '伤害'}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}</p>
                                    <p>特殊加成: ${link.specialproperty.map(prop => `${getElementName(prop[2])}${getElementName(prop[1]) == 'defDamageClass' ? '防御' : '伤害'}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}</p>
                                    <button class="btn btn-primary select-link" data-link-id="${link.id}">装备</button>
                                </li>
                            `).join('')}
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                </div>
            </div>
        </div>
    `;

    // 使用 Bootstrap 的 showModal 方法显示模态框
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // 延迟绑定事件，确保 DOM 元素已加载
    modal.addEventListener('shown.bs.modal', () => {
        modal.querySelectorAll('.select-link').forEach(button => {
            button.addEventListener('click', () => {
                const linkId = button.dataset.linkId;
                const selectedLink = meridianLinkConfig[linkId];
                if (selectedLink) {
                    // 删除旧的属性加成和特殊加成元素
                    const existingProperties = grooveElement.querySelectorAll('.highlight-property, .highlight-special');
                    existingProperties.forEach(el => el.remove());

                    // 创建新的属性加成元素
                    const propertyElement = document.createElement('p');
                    propertyElement.className = 'highlight-property';
                    propertyElement.textContent = `属性加成: ${selectedLink.property.map(prop => `${getElementName(prop[2])}${getElementName(prop[1]) == 'defDamageClass' ? '防御' : '伤害'}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}`;

                    // 创建新的特殊加成元素
                    const specialElement = document.createElement('p');
                    specialElement.className = 'highlight-special';
                    specialElement.textContent = `特殊加成: ${selectedLink.specialproperty.map(prop => `${getElementName(prop[2])}${getElementName(prop[1]) == 'defDamageClass' ? '防御' : '伤害'}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}`;

                    // 插入新元素（保持原有逻辑）
                    const lastChild = grooveElement.lastElementChild;
                    if (lastChild) {
                        grooveElement.insertBefore(propertyElement, lastChild.nextSibling);
                        grooveElement.insertBefore(specialElement, lastChild.nextSibling);
                    } else {
                        grooveElement.appendChild(propertyElement);
                        grooveElement.appendChild(specialElement);
                    }
                }
            });
        });
    });

    return modal;
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
            propertyElement.textContent = `属性加成: ${link.property.map(prop => `${getElementName(prop[2])}${getElementName(prop[1]) == 'defDamageClass' ? '防御' : '伤害'}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}`;
            linkElement.appendChild(propertyElement);

            const specialTextElement = document.createElement('p');
            specialTextElement.textContent = `特殊加成: ${link.specialproperty.map(prop => `${getElementName(prop[2])}${getElementName(prop[1]) == 'defDamageClass' ? '防御' : '伤害'}: ${Number(prop[3] * 100).toFixed(2)}%`).join(', ')}`;
            linkElement.appendChild(specialTextElement);

            const specialUnlockTextElement = document.createElement('p');
            specialUnlockTextElement.textContent = `特殊加成解锁条件: ${link.SUnlocktext||""}`;
            linkElement.appendChild(specialUnlockTextElement);

            result[category] += linkElement.outerHTML;
        });
    });

    return result;
}
