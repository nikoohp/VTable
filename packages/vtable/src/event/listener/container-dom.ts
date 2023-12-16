import { isValid } from '@visactor/vutils';
import type { EventHandler } from '../EventHandler';
import type { KeydownEvent, ListTableAPI } from '../../ts-types';
import { TABLE_EVENT_TYPE } from '../../core/TABLE_EVENT_TYPE';
import { handleWhell } from '../scroll';
import { browser } from '../../tools/helper';
import type { EventManager } from '../event';

export function bindContainerDomListener(eventManager: EventManager) {
  const table = eventManager.table;
  const stateManager = table.stateManager;
  const handler: EventHandler = table.internalProps.handler;

  handler.on(table.getElement(), 'blur', (e: MouseEvent) => {
    eventManager.dealTableHover();
    // eventManager.dealTableSelect();
  });

  handler.on(table.getElement(), 'wheel', (e: WheelEvent) => {
    handleWhell(e, stateManager);
  });

  // 监听键盘事件
  handler.on(table.getElement(), 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      if (table.keyboardOptions?.selectAllOnCtrlA) {
        // 处理全选
        e.preventDefault();
        //全选
        eventManager.deelTableSelectAll();
      }
    } else if (
      stateManager.select.cellPos.col >= 0 &&
      stateManager.select.cellPos.row >= 0 &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
    ) {
      e.preventDefault();
      let targetCol;
      let targetRow;

      // 处理向上箭头键
      if (e.key === 'ArrowUp') {
        targetCol = stateManager.select.cellPos.col;
        targetRow = Math.min(table.rowCount - 1, Math.max(0, stateManager.select.cellPos.row - 1));
      } else if (e.key === 'ArrowDown') {
        // 处理向下箭头键
        targetCol = stateManager.select.cellPos.col;
        targetRow = Math.min(table.rowCount - 1, Math.max(0, stateManager.select.cellPos.row + 1));
      } else if (e.key === 'ArrowLeft') {
        // 处理向左箭头键
        targetRow = stateManager.select.cellPos.row;
        targetCol = Math.min(table.colCount - 1, Math.max(0, stateManager.select.cellPos.col - 1));
      } else if (e.key === 'ArrowRight') {
        // 处理向右箭头键
        targetRow = stateManager.select.cellPos.row;
        targetCol = Math.min(table.colCount - 1, Math.max(0, stateManager.select.cellPos.col + 1));
      }
      table.selectCell(targetCol, targetRow);
      if ((table as ListTableAPI).editorManager.editingEditor) {
        (table as ListTableAPI).editorManager.completeEdit();
        if ((table as ListTableAPI).getEditor(targetCol, targetRow)) {
          (table as ListTableAPI).editorManager.startEditCell(targetCol, targetRow);
        } else {
          table.getElement().focus();
        }
      }
    } else if (e.key === 'Escape') {
      if ((table as ListTableAPI).editorManager.editingEditor) {
        (table as ListTableAPI).editorManager.editingEditor.exit();
        (table as ListTableAPI).editorManager.editingEditor = null;
      }
    } else if (e.key === 'Enter') {
      // 如果按enter键 可以结束当前的编辑 或开启编辑选中的单元格（仅限单选）
      if ((table as ListTableAPI).editorManager.editingEditor) {
        (table as ListTableAPI).editorManager.completeEdit();
        table.getElement().focus();
      } else {
        if ((table.stateManager.select.ranges?.length ?? 0) === 1) {
          const startCol = table.stateManager.select.ranges[0].start.col;
          const startRow = table.stateManager.select.ranges[0].start.row;
          const endCol = table.stateManager.select.ranges[0].end.col;
          const endRow = table.stateManager.select.ranges[0].end.row;
          if (startCol === endCol && startRow === endRow) {
            if ((table as ListTableAPI).getEditor(startCol, startRow)) {
              (table as ListTableAPI).editorManager.startEditCell(startCol, startRow);
            }
          }
        }
      }
    }

    if ((table as any).hasListeners(TABLE_EVENT_TYPE.KEYDOWN)) {
      const cellsEvent: KeydownEvent = {
        keyCode: e.keyCode ?? e.which,
        code: e.code,
        event: e,
        // cells: table.getSelectedCellInfos(),
        scaleRatio: table.canvas.getBoundingClientRect().width / table.canvas.offsetWidth
      };
      table.fireListeners(TABLE_EVENT_TYPE.KEYDOWN, cellsEvent);
    }
  });

  handler.on(table.getElement(), 'copy', (e: KeyboardEvent) => {
    if (table.keyboardOptions?.copySelected) {
      const data = table.getCopyValue();
      if (isValid(data)) {
        e.preventDefault();
        if (browser.IE) {
          (window as any).clipboardData.setData('Text', data); // IE
        } else {
          (e as any).clipboardData.setData('text/plain', data); // Chrome, Firefox
        }
        table.fireListeners(TABLE_EVENT_TYPE.COPY_DATA, {
          cellRange: table.stateManager.select.ranges,
          copyData: data
        });
      }
    }
  });

  handler.on(table.getElement(), 'contextmenu', (e: any) => {
    e.preventDefault();
  });

  handler.on(table.getContainer(), 'resize', () => {
    table.resize();
  });
}
