describe('Archivio Dashboard', () => {
  it('should open and show the app title', async () => {
    await browser.pause(2000);
    await expect($('h1')).toHaveText('Archivio');
  });

  it('should show settings button', async () => {
    await expect($('.btn-settings')).toExist();
  });

  it('should navigate to settings and back', async () => {
    await $('.btn-settings').click();
    await browser.pause(2000);
    expect((await $('body').getHTML())).toContain('settings-page');

    await browser.execute(() => {
      const btn = document.querySelector('.settings-page header .btn') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await browser.pause(2000);
    await expect($('h1')).toHaveText('Archivio');
  });

  it('should create a project via form', async () => {
    await browser.execute(() => {
      const btns = document.querySelectorAll('.btn.primary');
      for (const btn of btns) {
        if (btn.textContent?.includes('Nuovo Progetto') || btn.textContent?.includes('New Project')) {
          (btn as HTMLButtonElement).click();
          break;
        }
      }
    });
    await browser.pause(2000);

    await browser.execute(() => {
      const inputs = document.querySelectorAll('.dialog input[type="text"]');
      if (inputs.length >= 3) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        setter.call(inputs[0], 'E2E-001');
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(inputs[1], 'E2E Test Project');
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(inputs[2], 'Test Client');
        inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await browser.pause(500);

    await browser.execute(() => {
      const btn = document.querySelector('.dialog button[type="submit"]') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await browser.pause(3000);

    expect((await $('body').getHTML())).toContain('E2E-001');
  });

  it('should navigate to project detail', async () => {
    await browser.execute(() => {
      const strongs = document.querySelectorAll('td strong');
      for (const el of strongs) {
        if (el.textContent?.includes('E2E-001')) {
          const td = el.closest('td');
          if (td) td.click();
          break;
        }
      }
    });
    await browser.pause(2000);
    expect((await $('body').getHTML())).toContain('project-detail');
  });

  it('should have editable fields on detail page', async () => {
    const editables = await $$('.editable-cell');
    expect(editables.length).toBeGreaterThan(0);
  });

  it('should edit a field inline', async () => {
    await browser.execute(() => {
      const cell = document.querySelector('.editable-cell');
      if (cell) cell.click();
    });
    await browser.pause(1000);

    await browser.execute(() => {
      const input = document.querySelector('.inline-editor') as HTMLInputElement;
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        setter.call(input, 'Updated Client');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await browser.pause(500);

    await browser.execute(() => {
      const input = document.querySelector('.inline-editor');
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    });
    await browser.pause(1000);

    expect((await $('body').getHTML())).toContain('Updated Client');
  });

  it('should navigate back to dashboard', async () => {
    await browser.execute(() => {
      const btns = document.querySelectorAll('.project-detail .btn');
      for (const btn of btns) {
        if (btn.textContent?.includes('Indietro') || btn.textContent?.includes('Back')) {
          (btn as HTMLButtonElement).click();
          break;
        }
      }
    });
    await browser.pause(2000);
    await expect($('h1')).toHaveText('Archivio');
  });

  it('should delete the test project', async () => {
    await browser.execute(() => {
      const strongs = document.querySelectorAll('td strong');
      for (const el of strongs) {
        if (el.textContent?.includes('E2E-001')) {
          const td = el.closest('td');
          if (td) td.click();
          break;
        }
      }
    });
    await browser.pause(2000);

    await browser.execute(() => {
      const btns = document.querySelectorAll('.project-detail .btn.danger');
      if (btns.length > 0) (btns[0] as HTMLButtonElement).click();
    });
    await browser.pause(1000);

    await browser.execute(() => {
      const btn = document.querySelector('.dialog .btn.danger') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await browser.pause(3000);

    await expect($('h1')).toHaveText('Archivio');
    expect((await $('body').getHTML())).not.toContain('E2E-001');
  });
});
