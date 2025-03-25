// 主文件
import { loadSkillData, getUniqueValues } from './modules/dataLoader.js';
import { initModals, createFilterBadges, clearFilters, matchesFilters, updateStats } from './modules/uiManager.js';
import { updateSkillList } from './modules/skillDisplay.js';

// 初始化页面
async function initializePage() {
    try {
        // 初始化所有Modal
        initModals();
        
        // 加载技能数据
        const skillData = await loadSkillData();
        
        // 创建门派过滤器
        const families = getUniqueValues(skillData.skills, 'familyList');
        createFilterBadges('familyFilters', families, 'family');
        
        // 添加搜索监听器
        document.getElementById('searchInput').addEventListener('input', () => {
            const { filteredCount, totalCount } = updateSkillList(skillData, matchesFilters);
            updateStats(filteredCount, totalCount);
        });
        
        // 初始显示技能列表
        const { filteredCount, totalCount } = updateSkillList(skillData, matchesFilters);
        updateStats(filteredCount, totalCount);
        
        // 添加清除过滤器的事件处理
        window.clearFilters = (filterType) => {
            clearFilters(filterType);
            const { filteredCount, totalCount } = updateSkillList(skillData, matchesFilters);
            updateStats(filteredCount, totalCount);
        };
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

// 页面加载完成后开始初始化
document.addEventListener('DOMContentLoaded', initializePage);