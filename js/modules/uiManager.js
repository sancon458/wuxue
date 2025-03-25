// UI管理模块
import { activeSkillData } from './dataLoader.js';
import { updateSkillList } from './skillDisplay.js'; // 导入 updateSkillList 函数
import { skillData } from '../script.js'; // 导入 skillData

// 模态窗口管理器
export const modalManager = {
    openModals: [],
    baseZIndex: 1050,

    open: function(modal, element) {
        const zIndex = this.baseZIndex + (this.openModals.length * 20);
        const modalInfo = {
            modal: modal,
            element: element,
            zIndex: zIndex
        };
        this.openModals.push(modalInfo);

        this.openModals.forEach(m => {
            if (m.element !== element) {
                m.element.classList.remove('top-modal');
            }
        });

        element.style.zIndex = zIndex;
        element.classList.add('top-modal');

        modal.show();

        requestAnimationFrame(() => {
            const backdrop = document.querySelector('.modal-backdrop:last-child');
            if (backdrop) {
                backdrop.style.zIndex = zIndex - 10;
                backdrop.setAttribute('data-modal-backdrop', element.id);
            }
        });
    },

    close: function(element) {
        const index = this.openModals.findIndex(m => m.element === element);
        if (index !== -1) {
            this.openModals.splice(index, 1);
            element.classList.remove('top-modal');
            
            const backdrop = document.querySelector(`[data-modal-backdrop="${element.id}"]`);
            if (backdrop) {
                backdrop.remove();
            }

            if (this.openModals.length > 0) {
                const topModal = this.openModals[this.openModals.length - 1];
                topModal.element.classList.add('top-modal');
                topModal.element.style.zIndex = topModal.zIndex;
                const topBackdrop = document.querySelector(`[data-modal-backdrop="${topModal.element.id}"]`);
                if (topBackdrop) {
                    topBackdrop.style.zIndex = topModal.zIndex - 10;
                }
            }
        }
    }
};

export let effectModal = null;
export let jsonModal = null;

// 初始化模态窗口
export function initModals() {
    const effectElement = document.getElementById('effectModal');
    const jsonElement = document.getElementById('jsonModal');
    
    effectModal = new bootstrap.Modal(effectElement);
    jsonModal = new bootstrap.Modal(jsonElement);

    [effectElement, jsonElement].forEach(element => {
        element.addEventListener('hidden.bs.modal', function() {
            modalManager.close(this);
        });

        element.style.zIndex = modalManager.baseZIndex;
    });
}

// 初始化过滤器状态
export const activeFilters = {
    family: new Set(),
    isJueXue: false // 修正关键字为 isJueXue
};

// 创建过滤器标签
export function createFilterBadges(containerId, values, filterType) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    values.sort().forEach(value => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary filter-badge';
        badge.textContent = value;
        badge.onclick = () => toggleFilter(badge, value, filterType); // 确保点击事件绑定正确
        container.appendChild(badge);
    });
}

// 清除过滤器
export function clearFilters(filterType) {
    activeFilters[filterType].clear();
    
    const containerId = filterType === 'family' ? 'familyFilters' : 'methodFilters';
    const badges = document.querySelectorAll(`#${containerId} .filter-badge`);
    badges.forEach(badge => badge.classList.remove('active'));
}

// 切换过滤器状态
export function toggleFilter(badge, value, filterType) {
    if (filterType === 'juelue') {
        activeFilters.isJueXue = !activeFilters.isJueXue; // 修正关键字为 isJueXue
        badge.classList.toggle('active');
    } else {
        if (activeFilters[filterType].has(value)) {
            activeFilters[filterType].delete(value);
            badge.classList.remove('active');
        } else {
            activeFilters[filterType].add(value);
            badge.classList.add('active');
        }
    }
    updateSkillList(skillData, matchesFilters); // 确保切换过滤器状态后更新技能列表
}

// 检查技能是否匹配过滤条件
export function matchesFilters(skill) {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    const searchMatch = !searchText || 
        Object.entries(skill).some(([key, value]) => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(searchText);
        });

    const familyMatch = activeFilters.family.size === 0 || 
        (skill.familyList && activeFilters.family.has(skill.familyList));

    const juelueMatch = !activeFilters.isJueXue || 
        (skill.mcmrestrict && skill.mcmrestrict.includes(',300'));

    return searchMatch && familyMatch && juelueMatch;
}

// 更新统计信息
export function updateStats(filteredCount, totalCount) {
    const statsInfo = document.getElementById('statsInfo');
    statsInfo.textContent = `显示 ${filteredCount} 个技能（共 ${totalCount} 个）`;
}